import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  pinHash: text('pin_hash').notNull(),
  role: text('role', { enum: ['owner', 'member'] }).default('member').notNull(),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
});

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  status: text('status', { enum: ['draft', 'rendering', 'done'] }).default('draft').notNull(),
  editState: text('edit_state').notNull(),
  thumbnail: text('thumbnail'),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'number' }).notNull(),
});

export const mediaFiles = sqliteTable('media_files', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
  type: text('type', { enum: ['video', 'image'] }).notNull(),
  filePath: text('file_path').notNull(),
  duration: real('duration'),
  width: integer('width'),
  height: integer('height'),
  sizeBytes: integer('size_bytes').notNull(),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
});

export const renderJobs = sqliteTable('render_jobs', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id).notNull(),
  status: text('status', { enum: ['queued', 'processing', 'done', 'failed'] }).default('queued').notNull(),
  progress: integer('progress').default(0).notNull(),
  formats: text('formats').notNull(),
  outputs: text('outputs').default('{}').notNull(),
  error: text('error'),
  createdAt: integer('created_at', { mode: 'number' }).notNull(),
});

export const templates = sqliteTable('templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category', { enum: ['organic', 'ad'] }).notNull(),
  description: text('description').notNull(),
  config: text('config').notNull(),
  thumbnail: text('thumbnail'),
  sortOrder: integer('sort_order').default(0).notNull(),
});

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey().default(1),
  companyName: text('company_name').default('Ru-Bric Plumbing').notNull(),
  logoPath: text('logo_path'),
  primaryColor: text('primary_color').default('#D4A534').notNull(),
  secondaryColor: text('secondary_color').default('#1A1A4E').notNull(),
  accentColor: text('accent_color').default('#7B2D8E').notNull(),
});
