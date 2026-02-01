import { Router, Request, Response } from 'express';
import type { AdminDependencies } from '../index';

export function createConversationsRouter(deps: AdminDependencies): Router {
  const router = Router();

  // List conversations
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { page = '1', limit = '20', active } = req.query;
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      let conversations: any[] = [];
      if (active === 'true' && deps.dataLayer.conversations?.findActive) {
        conversations = await deps.dataLayer.conversations.findActive();
      } else if (deps.dataLayer.conversations?.getAll) {
        conversations = await deps.dataLayer.conversations.getAll();
      } else if (deps.dataLayer.conversations?.findActive) {
        conversations = await deps.dataLayer.conversations.findActive();
      }

      // Ensure it's an array
      if (!Array.isArray(conversations)) {
        conversations = (conversations as any)?.data || (conversations as any)?.conversations || [];
      }

      const total = conversations.length;
      const start = (pageNum - 1) * limitNum;
      const paginated = conversations.slice(start, start + limitNum);

      res.json({
        conversations: paginated,
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum),
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get conversation by ID
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!deps.dataLayer.conversations?.get) {
        return res.status(501).json({ error: 'Not supported with current data layer' });
      }
      const conversation = await deps.dataLayer.conversations.get(id);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      res.json(conversation);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get messages for a conversation
  router.get('/:id/messages', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      if (!deps.dataLayer.conversations?.getMessages) {
        return res.status(501).json({ error: 'Not supported with current data layer' });
      }
      const messages = await deps.dataLayer.conversations.getMessages(id);
      res.json(Array.isArray(messages) ? messages : messages?.data || []);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Switch conversation to AI mode
  router.post('/:id/ai-mode', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await deps.orchestrator.switchToAIMode(id);
      res.json({ success: true, conversationId: id, mode: 'ai' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Get conversation mode
  router.get('/:id/mode', (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const isHuman = deps.orchestrator.isHumanMode(id);
      res.json({ conversationId: id, mode: isHuman ? 'human' : 'ai' });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}
