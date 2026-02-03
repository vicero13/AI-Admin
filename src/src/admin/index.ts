import { Router } from 'express';
import express from 'express';
import path from 'path';
import rateLimit from 'express-rate-limit';
import { createLoginHandler, createAuthMiddleware, validateLogin } from './auth';
import { createKnowledgeRouter } from './routes/knowledge';
import { createSettingsRouter } from './routes/settings';
import { createConversationsRouter } from './routes/conversations';
import { createStatsRouter } from './routes/stats';
import { createConverterRouter } from './routes/converter';
import { createChatConfigRouter } from './routes/chat-config';
import { createOfficesRouter } from './routes/offices';

export interface AdminDependencies {
  dataLayer: any;
  knowledgeBase: any;
  orchestrator: any;
  configPath: string;
  knowledgeBasePath: string;
  anthropicApiKey: string;
  openaiApiKey?: string;
  aiProvider?: string;
}

// Rate limiter for login endpoint (strict)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for general API endpoints
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

export function createAdminRouter(deps: AdminDependencies): Router {
  const router = Router();
  const auth = createAuthMiddleware(deps.configPath);

  // Login (unprotected but rate-limited)
  router.post('/api/admin/login', loginLimiter, validateLogin, createLoginHandler(deps.configPath));

  // Protected API routes (with rate limiting)
  router.use('/api/admin/knowledge', apiLimiter, auth, createKnowledgeRouter(deps));
  router.use('/api/admin/settings', apiLimiter, auth, createSettingsRouter(deps));
  router.use('/api/admin/conversations', apiLimiter, auth, createConversationsRouter(deps));
  router.use('/api/admin/stats', apiLimiter, auth, createStatsRouter(deps));
  router.use('/api/admin/converter', apiLimiter, auth, createConverterRouter(deps));
  router.use('/api/admin/chat-config', apiLimiter, auth, createChatConfigRouter(deps));
  router.use('/api/admin/offices', apiLimiter, auth, createOfficesRouter(deps));

  // Serve frontend static files
  const uiPath = path.join(__dirname, 'ui', 'dist');
  router.use('/admin/assets', express.static(path.join(uiPath, 'assets')));

  // SPA fallback: serve index.html for all /admin/* routes
  router.get('/admin', (_req, res) => {
    res.sendFile(path.join(uiPath, 'index.html'));
  });
  router.get('/admin/*', (_req, res) => {
    res.sendFile(path.join(uiPath, 'index.html'));
  });

  return router;
}
