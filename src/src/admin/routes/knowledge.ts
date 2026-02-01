import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as knowledgeService from '../services/knowledge-service';
import { parseDialogFile } from '../services/dialog-parser';
import type { AdminDependencies } from '../index';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

export function createKnowledgeRouter(deps: AdminDependencies): Router {
  const router = Router();
  const bp = deps.knowledgeBasePath;

  // ===================== Business Info =====================
  router.get('/business-info', (_req: Request, res: Response) => {
    try {
      res.json(knowledgeService.getBusinessInfo(bp));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.put('/business-info', (req: Request, res: Response) => {
    try {
      knowledgeService.saveBusinessInfo(bp, req.body);
      deps.knowledgeBase.reload();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ===================== Services =====================
  router.get('/services', (_req: Request, res: Response) => {
    try {
      res.json(knowledgeService.getServices(bp));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.put('/services', (req: Request, res: Response) => {
    try {
      knowledgeService.saveServices(bp, req.body);
      deps.knowledgeBase.reload();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ===================== Team =====================
  router.get('/team', (_req: Request, res: Response) => {
    try {
      res.json(knowledgeService.getTeam(bp));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.put('/team', (req: Request, res: Response) => {
    try {
      knowledgeService.saveTeam(bp, req.body);
      deps.knowledgeBase.reload();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ===================== FAQ =====================
  router.get('/faq', (_req: Request, res: Response) => {
    try {
      const files = knowledgeService.getFaqFiles(bp);
      const data: Record<string, unknown> = {};
      for (const f of files) {
        data[f] = knowledgeService.getFaqFile(bp, f);
      }
      res.json({ files, data });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/faq/:filename', (req: Request, res: Response) => {
    try {
      res.json(knowledgeService.getFaqFile(bp, req.params.filename));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.put('/faq/:filename', (req: Request, res: Response) => {
    try {
      knowledgeService.saveFaqFile(bp, req.params.filename, req.body);
      deps.knowledgeBase.reload();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ===================== Policies =====================
  router.get('/policies', (_req: Request, res: Response) => {
    try {
      const files = knowledgeService.getPolicyFiles(bp);
      const data: Record<string, unknown> = {};
      for (const f of files) {
        data[f] = knowledgeService.getPolicyFile(bp, f);
      }
      res.json({ files, data });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/policies/:filename', (req: Request, res: Response) => {
    try {
      res.json(knowledgeService.getPolicyFile(bp, req.params.filename));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.put('/policies/:filename', (req: Request, res: Response) => {
    try {
      knowledgeService.savePolicyFile(bp, req.params.filename, req.body);
      deps.knowledgeBase.reload();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ===================== Dialogs =====================
  router.get('/dialogs', (_req: Request, res: Response) => {
    try {
      const files = knowledgeService.getDialogFiles(bp);
      const data: Record<string, unknown> = {};
      for (const f of files) {
        data[f] = knowledgeService.getDialogFile(bp, f);
      }
      res.json({ files, data });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.get('/dialogs/examples', (_req: Request, res: Response) => {
    try {
      res.json(knowledgeService.getDialogExamples(bp));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  router.put('/dialogs/examples', (req: Request, res: Response) => {
    try {
      knowledgeService.saveDialogExamples(bp, req.body);
      deps.knowledgeBase.reload();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Upload dialog file (multipart)
  router.post('/dialogs/upload', upload.single('file'), (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      const dialogs = parseDialogFile(req.file.buffer, req.file.originalname);
      res.json({ dialogs, count: dialogs.length });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Import dialogs (merge with existing)
  router.post('/dialogs/import', (req: Request, res: Response) => {
    try {
      const newDialogs = req.body.dialogs || req.body;
      if (!Array.isArray(newDialogs)) {
        return res.status(400).json({ error: 'Expected array of dialogs' });
      }
      const existing = knowledgeService.getDialogExamples(bp) as any[];
      const merged = [...(Array.isArray(existing) ? existing : []), ...newDialogs];
      knowledgeService.saveDialogExamples(bp, merged);
      deps.knowledgeBase.reload();
      res.json({ success: true, added: newDialogs.length, total: merged.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ===================== Metadata =====================
  router.get('/metadata', (_req: Request, res: Response) => {
    try {
      res.json(knowledgeService.getMetadata(bp));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Reload knowledge base
  router.post('/reload', async (_req: Request, res: Response) => {
    try {
      await deps.knowledgeBase.reload();
      const stats = deps.knowledgeBase.getStats();
      res.json({ success: true, stats });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  return router;
}
