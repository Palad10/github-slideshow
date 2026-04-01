import { Router } from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';
import { eq } from 'drizzle-orm';
import db from '../db/index.js';
import { mediaFiles } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

const UPLOADS_DIR = process.env.UPLOADS_DIR || './uploads';

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${nanoid(16)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video and image files are allowed'));
    }
  },
});

const router = Router();

// Batch upload
router.post('/upload', authMiddleware, upload.array('files', 20), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    const projectId = req.body.projectId;

    if (!files?.length) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }
    if (!projectId) {
      res.status(400).json({ error: 'projectId required' });
      return;
    }

    const results = [];
    for (const file of files) {
      const id = nanoid(12);
      const type = file.mimetype.startsWith('video/') ? 'video' : 'image';

      db.insert(mediaFiles).values({
        id,
        projectId,
        type: type as 'video' | 'image',
        filePath: file.path,
        sizeBytes: file.size,
        createdAt: Date.now(),
      }).run();

      results.push({
        id,
        type,
        filename: file.filename,
        size: file.size,
        duration: null,
      });
    }

    res.json(results);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Serve media file
router.get('/:id', async (req, res) => {
  try {
    const media = db.select().from(mediaFiles).where(eq(mediaFiles.id, req.params.id as string)).get();
    if (!media) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    if (!fs.existsSync(media.filePath)) {
      res.status(404).json({ error: 'File not found on disk' });
      return;
    }

    const stat = fs.statSync(media.filePath);
    const ext = path.extname(media.filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';

    // Support range requests for video streaming
    const range = req.headers.range;
    if (range && media.type === 'video') {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType,
      });
      fs.createReadStream(media.filePath, { start, end }).pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type': contentType,
      });
      fs.createReadStream(media.filePath).pipe(res);
    }
  } catch (err) {
    console.error('Serve media error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Serve thumbnail (placeholder - generates a simple thumbnail)
router.get('/:id/thumbnail', async (req, res) => {
  try {
    const media = db.select().from(mediaFiles).where(eq(mediaFiles.id, req.params.id as string)).get();
    if (!media) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // For images, serve the image itself as thumbnail
    if (media.type === 'image' && fs.existsSync(media.filePath)) {
      res.sendFile(path.resolve(media.filePath));
      return;
    }

    // For video, try to find a thumbnail or return placeholder
    const thumbPath = media.filePath.replace(/\.[^.]+$/, '_thumb.jpg');
    if (fs.existsSync(thumbPath)) {
      res.sendFile(path.resolve(thumbPath));
      return;
    }

    // Return a 1x1 transparent PNG placeholder
    const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
    res.set('Content-Type', 'image/png');
    res.send(pixel);
  } catch (err) {
    console.error('Thumbnail error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
