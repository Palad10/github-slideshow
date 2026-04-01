import bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { eq } from 'drizzle-orm';
import db from '../db/index.js';
import { users } from '../db/schema.js';

export async function seedOwner() {
  // Check if any users exist
  const existing = db.select().from(users).limit(1).all();
  if (existing.length > 0) return;

  // Create default owner account
  const pinHash = await bcrypt.hash('1234', 10);
  db.insert(users).values({
    id: nanoid(12),
    name: 'Boss',
    pinHash,
    role: 'owner',
    createdAt: Date.now(),
  }).run();

  console.log('  Default owner account created:');
  console.log('  Name: Boss');
  console.log('  PIN: 1234');
  console.log('  (Change this in Settings after first login)\n');
}
