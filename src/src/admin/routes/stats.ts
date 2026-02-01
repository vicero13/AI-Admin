import { Router, Request, Response } from 'express';
import type { AdminDependencies } from '../index';

export function createStatsRouter(deps: AdminDependencies): Router {
  const router = Router();

  // Overview stats
  router.get('/', async (_req: Request, res: Response) => {
    try {
      const metrics = deps.orchestrator.getMetrics();
      const kbStats = deps.knowledgeBase.getStats();

      let handoffStats = null;
      if (deps.dataLayer.handoffs?.getStats) {
        try {
          handoffStats = await deps.dataLayer.handoffs.getStats();
        } catch { /* ignore */ }
      }

      res.json({
        metrics,
        knowledgeBase: kbStats,
        handoffs: handoffStats,
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Knowledge base stats
  router.get('/knowledge', (_req: Request, res: Response) => {
    try {
      const stats = deps.knowledgeBase.getStats();
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Handoff stats
  router.get('/handoffs', async (_req: Request, res: Response) => {
    try {
      if (!deps.dataLayer.handoffs?.getStats) {
        return res.status(501).json({ error: 'Handoff stats not available' });
      }
      const stats = await deps.dataLayer.handoffs.getStats();
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // FAQ usage stats
  router.get('/faq-usage', (_req: Request, res: Response) => {
    try {
      const faq = deps.knowledgeBase.getFAQ();
      const sorted = [...faq].sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0));
      res.json(sorted.slice(0, 20));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // System metrics
  router.get('/metrics', (_req: Request, res: Response) => {
    try {
      const metrics = deps.orchestrator.getMetrics();
      res.json(metrics);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}
