import { Router } from 'express';
import { eq } from 'drizzle-orm';
import db from '../db/index.js';
import { settings } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Get settings
router.get('/', authMiddleware, async (_req, res) => {
  try {
    const result = db.select().from(settings).where(eq(settings.id, 1)).get();
    res.json(result || {
      companyName: 'Ru-Bric Plumbing',
      primaryColor: '#D4A534',
      secondaryColor: '#1A1A4E',
      accentColor: '#7B2D8E',
    });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update settings
router.put('/', authMiddleware, async (req, res) => {
  try {
    const { companyName, primaryColor, secondaryColor, accentColor, logoPath } = req.body;
    const updates: Record<string, any> = {};
    if (companyName !== undefined) updates.companyName = companyName;
    if (primaryColor !== undefined) updates.primaryColor = primaryColor;
    if (secondaryColor !== undefined) updates.secondaryColor = secondaryColor;
    if (accentColor !== undefined) updates.accentColor = accentColor;
    if (logoPath !== undefined) updates.logoPath = logoPath;

    db.update(settings).set(updates).where(eq(settings.id, 1)).run();
    res.json({ ok: true });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
