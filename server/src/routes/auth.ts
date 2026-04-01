import { Router } from 'express';
import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import db from '../db/index.js';
import { users } from '../db/schema.js';
import { generateToken, authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { name, pin } = req.body;
    if (!name || !pin) {
      res.status(400).json({ error: 'Name and PIN required' });
      return;
    }

    const user = db.select().from(users).where(eq(users.name, name)).get();
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const valid = await bcrypt.compare(pin, user.pinHash);
    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken(user.id, user.role);
    res.json({
      token,
      user: { id: user.id, name: user.name, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Register new team member (requires auth)
router.post('/register', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, pin } = req.body;
    if (!name || !pin) {
      res.status(400).json({ error: 'Name and PIN required' });
      return;
    }

    const existing = db.select().from(users).where(eq(users.name, name)).get();
    if (existing) {
      res.status(400).json({ error: 'Name already taken' });
      return;
    }

    const id = nanoid(12);
    const pinHash = await bcrypt.hash(pin, 10);

    db.insert(users).values({
      id,
      name,
      pinHash,
      role: 'member',
      createdAt: Date.now(),
    }).run();

    res.json({ id, name, role: 'member' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// List users (requires auth)
router.get('/users', authMiddleware, async (_req, res) => {
  try {
    const allUsers = db.select({
      id: users.id,
      name: users.name,
      role: users.role,
    }).from(users).all();
    res.json(allUsers);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
