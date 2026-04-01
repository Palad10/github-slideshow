import { Router } from 'express';
import { nanoid } from 'nanoid';
import { eq, desc } from 'drizzle-orm';
import db from '../db/index.js';
import { projects, mediaFiles } from '../db/schema.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = Router();

const DEFAULT_EDIT_STATE = JSON.stringify({
  mediaFiles: [],
  clips: [],
  textOverlays: [],
  branding: { showLogo: true, logoPosition: 'bottom-right', showWatermark: false },
  music: null,
  filter: null,
  adMode: false,
  cta: null,
  contactBar: null,
});

// List projects
router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const allProjects = db
      .select()
      .from(projects)
      .where(eq(projects.userId, req.userId!))
      .orderBy(desc(projects.updatedAt))
      .all();
    res.json(allProjects);
  } catch (err) {
    console.error('List projects error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get project
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const project = db.select().from(projects).where(eq(projects.id, req.params.id as string)).get();
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const media = db.select().from(mediaFiles).where(eq(mediaFiles.projectId, project.id)).all();

    // Merge media into editState
    let editState = JSON.parse(project.editState);
    editState.mediaFiles = media.map((m) => ({
      id: m.id,
      type: m.type,
      url: `/api/media/${m.id}`,
      duration: m.duration || 0,
      thumbnail: `/api/media/${m.id}/thumbnail`,
    }));

    res.json({
      ...project,
      editState,
    });
  } catch (err) {
    console.error('Get project error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create project
router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const id = nanoid(12);
    const now = Date.now();
    db.insert(projects).values({
      id,
      userId: req.userId!,
      title: req.body.title || 'Untitled Video',
      status: 'draft',
      editState: req.body.editState || DEFAULT_EDIT_STATE,
      createdAt: now,
      updatedAt: now,
    }).run();
    res.json({ id });
  } catch (err) {
    console.error('Create project error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update project
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const updates: Record<string, any> = { updatedAt: Date.now() };
    if (req.body.title) updates.title = req.body.title;
    if (req.body.editState) updates.editState = typeof req.body.editState === 'string' ? req.body.editState : JSON.stringify(req.body.editState);
    if (req.body.status) updates.status = req.body.status;

    db.update(projects).set(updates).where(eq(projects.id, req.params.id as string)).run();
    res.json({ ok: true });
  } catch (err) {
    console.error('Update project error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete project
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    db.delete(projects).where(eq(projects.id, req.params.id as string)).run();
    res.json({ ok: true });
  } catch (err) {
    console.error('Delete project error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
