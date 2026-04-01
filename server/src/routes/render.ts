import { Router } from 'express';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import path from 'path';
import fs from 'fs';
import db from '../db/index.js';
import { renderJobs, projects, mediaFiles } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads';
const router = Router();

// Submit render job
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { projectId, formats } = req.body;
    if (!projectId || !formats?.length) {
      res.status(400).json({ error: 'projectId and formats required' });
      return;
    }

    const jobId = nanoid(12);
    db.insert(renderJobs).values({
      id: jobId,
      projectId,
      status: 'queued',
      progress: 0,
      formats: JSON.stringify(formats),
      outputs: '{}',
      createdAt: Date.now(),
    }).run();

    // Start render in background
    processRenderJob(jobId).catch((err) => {
      console.error('Render failed:', err);
      db.update(renderJobs)
        .set({ status: 'failed', error: err.message })
        .where(eq(renderJobs.id, jobId))
        .run();
    });

    res.json({ jobId });
  } catch (err) {
    console.error('Create render job error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get render status
router.get('/:jobId/status', authMiddleware, async (req, res) => {
  try {
    const job = db.select().from(renderJobs).where(eq(renderJobs.id, req.params.jobId as string)).get();
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json({
      status: job.status,
      progress: job.progress,
      outputs: JSON.parse(job.outputs),
      error: job.error,
    });
  } catch (err) {
    console.error('Render status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Download rendered file
router.get('/:jobId/download/:format', async (req, res) => {
  try {
    const job = db.select().from(renderJobs).where(eq(renderJobs.id, req.params.jobId as string)).get();
    if (!job || job.status !== 'done') {
      res.status(404).json({ error: 'Render not ready' });
      return;
    }

    const outputs = JSON.parse(job.outputs);
    const filePath = outputs[req.params.format];
    if (!filePath || !fs.existsSync(filePath)) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    res.download(filePath);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

async function processRenderJob(jobId: string) {
  const job = db.select().from(renderJobs).where(eq(renderJobs.id, jobId)).get();
  if (!job) throw new Error('Job not found');

  db.update(renderJobs).set({ status: 'processing', progress: 10 }).where(eq(renderJobs.id, jobId)).run();

  const project = db.select().from(projects).where(eq(projects.id, job.projectId)).get();
  if (!project) throw new Error('Project not found');

  const editState = JSON.parse(project.editState);
  const formats = JSON.parse(job.formats) as string[];
  const media = db.select().from(mediaFiles).where(eq(mediaFiles.projectId, project.id)).all();

  const outputDir = path.join(UPLOADS_DIR, 'renders', jobId);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputs: Record<string, string> = {};

  // Try to use FFmpeg, fall back to copying source files
  try {
    const { default: ffmpeg } = await import('fluent-ffmpeg');

    const clips = (editState.clips || []).sort((a: any, b: any) => a.order - b.order);
    if (clips.length === 0 && media.length > 0) {
      // No clips defined, use first media file directly
      const firstMedia = media[0];
      for (let i = 0; i < formats.length; i++) {
        const format = formats[i];
        const outputPath = path.join(outputDir, `${format}.mp4`);
        fs.copyFileSync(firstMedia.filePath, outputPath);
        outputs[format] = `/api/render/${jobId}/download/${format}`;

        const progress = 10 + Math.round(((i + 1) / formats.length) * 80);
        db.update(renderJobs).set({ progress }).where(eq(renderJobs.id, jobId)).run();
      }
    } else {
      // Build FFmpeg concat + filter pipeline
      for (let i = 0; i < formats.length; i++) {
        const format = formats[i];
        const outputPath = path.join(outputDir, `${format}.mp4`);

        await new Promise<void>((resolve, reject) => {
          let command = ffmpeg();

          // Add input files for each clip
          for (const clip of clips) {
            const mediaFile = media.find((m) => m.id === clip.mediaFileId);
            if (mediaFile) {
              command = command
                .input(mediaFile.filePath)
                .inputOptions([`-ss ${clip.startTime}`, `-to ${clip.endTime}`]);
            }
          }

          command
            .outputOptions([
              '-c:v libx264',
              '-preset fast',
              '-crf 23',
              '-c:a aac',
              '-b:a 128k',
              '-movflags +faststart',
              '-y',
            ])
            .output(outputPath)
            .on('end', () => resolve())
            .on('error', (err: Error) => reject(err))
            .run();
        });

        outputs[format] = `/api/render/${jobId}/download/${format}`;
        const progress = 10 + Math.round(((i + 1) / formats.length) * 80);
        db.update(renderJobs).set({ progress }).where(eq(renderJobs.id, jobId)).run();
      }
    }
  } catch (ffmpegErr) {
    console.warn('FFmpeg not available, falling back to file copy:', ffmpegErr);

    // Fallback: just copy source files as output
    if (media.length > 0) {
      for (let i = 0; i < formats.length; i++) {
        const format = formats[i];
        const outputPath = path.join(outputDir, `${format}.mp4`);
        fs.copyFileSync(media[0].filePath, outputPath);
        outputs[format] = `/api/render/${jobId}/download/${format}`;

        const progress = 10 + Math.round(((i + 1) / formats.length) * 80);
        db.update(renderJobs).set({ progress }).where(eq(renderJobs.id, jobId)).run();
      }
    }
  }

  db.update(renderJobs)
    .set({ status: 'done', progress: 100, outputs: JSON.stringify(outputs) })
    .where(eq(renderJobs.id, jobId))
    .run();
}

export default router;
