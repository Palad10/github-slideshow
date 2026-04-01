import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';

// Initialize database (creates tables)
import './db/index.js';

// Import routes
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import mediaRoutes from './routes/media.js';
import renderRoutes from './routes/render.js';
import settingsRoutes from './routes/settings.js';

// Seed owner account
import { seedOwner } from './services/seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3000');

const app = express();

// Middleware
app.use(cors());
app.use(helmet({
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginEmbedderPolicy: { policy: 'require-corp' },
  contentSecurityPolicy: false,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/render', renderRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'Ru-Bric Video Creator' });
});

// Serve client build in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Seed default owner
seedOwner();

app.listen(PORT, () => {
  console.log(`\n  🔧 Ru-Bric Video Creator API`);
  console.log(`  Server running on http://localhost:${PORT}`);
  console.log(`  Health check: http://localhost:${PORT}/api/health\n`);
});
