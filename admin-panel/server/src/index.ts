import express from 'express';
import cors from 'cors';
import path from 'path';
import rateLimit from 'express-rate-limit';
import configRoutes from './routes/config';
import knowledgeRoutes from './routes/knowledge-base';
import dialogRoutes from './routes/dialogs';
import statusRoutes from './routes/status';

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
app.use('/api/config', apiLimiter, configRoutes);
app.use('/api/knowledge', apiLimiter, knowledgeRoutes);
app.use('/api/dialogs', apiLimiter, dialogRoutes);
app.use('/api/status', apiLimiter, statusRoutes);

// Serve built frontend in production
const distPath = path.resolve(__dirname, '../../dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Admin panel server running on http://localhost:${PORT}`);
});
