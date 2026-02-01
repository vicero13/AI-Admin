import { Router } from 'express';
import express from 'express';
import path from 'path';
import { createLoginHandler, createAuthMiddleware } from './auth';
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
}

export function createAdminRouter(deps: AdminDependencies): Router {
  const router = Router();
  const auth = createAuthMiddleware(deps.configPath);

  // Login (unprotected)
  router.post('/api/admin/login', createLoginHandler(deps.configPath));

  // Protected API routes
  router.use('/api/admin/knowledge', auth, createKnowledgeRouter(deps));
  router.use('/api/admin/settings', auth, createSettingsRouter(deps));
  router.use('/api/admin/conversations', auth, createConversationsRouter(deps));
  router.use('/api/admin/stats', auth, createStatsRouter(deps));
  router.use('/api/admin/converter', auth, createConverterRouter(deps));
  router.use('/api/admin/chat-config', auth, createChatConfigRouter(deps));
  router.use('/api/admin/offices', auth, createOfficesRouter(deps));

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
