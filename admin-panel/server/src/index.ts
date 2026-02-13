import dotenv from 'dotenv';
import path from 'path';

// Load env vars from main project's .env file
dotenv.config({ path: path.resolve(__dirname, '../../../src/.env') });

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import configRoutes from './routes/config';
import knowledgeRoutes from './routes/knowledge-base';
import dialogRoutes from './routes/dialogs';
import statusRoutes from './routes/status';
import knowledgeChatRoutes from './routes/knowledge-chat';
import officesRoutes from './routes/offices';
import mediaRoutes from './routes/media';
import { PATHS } from './utils/paths';

const app = express();
const PORT = parseInt(process.env.ADMIN_PORT || '4000', 10);

// CORS: restrict to configured origins
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://localhost:4000'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Health check endpoints
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

app.get('/ready', (_req, res) => {
  res.json({ status: 'ready' });
});

// API routes (rate-limited)
// NOTE: /api/knowledge/chat MUST be before /api/knowledge to avoid route conflicts
app.use('/api/config', apiLimiter, configRoutes);
app.use('/api/knowledge/chat', apiLimiter, knowledgeChatRoutes);
app.use('/api/knowledge', apiLimiter, knowledgeRoutes);
app.use('/api/dialogs', apiLimiter, dialogRoutes);
app.use('/api/status', apiLimiter, statusRoutes);
app.use('/api/admin/offices', apiLimiter, officesRoutes);
app.use('/api/admin/media', apiLimiter, mediaRoutes);

// Serve uploaded media files
app.use('/media', express.static(PATHS.mediaFiles));

// Serve built frontend (base path = /admin/)
const distPath = path.resolve(__dirname, '../../dist');
app.use('/admin', express.static(distPath));
app.get('/admin/*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Admin panel server running on http://localhost:${PORT}`);
});
