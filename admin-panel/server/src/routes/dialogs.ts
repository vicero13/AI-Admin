import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as ks from '../services/knowledge-service';
import { parseDialogFile } from '../services/dialog-parser';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

// List dialog files
router.get('/', (_req: Request, res: Response) => {
  try {
    const files = ks.getDialogFiles();
    res.json({ files });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get current examples
router.get('/examples', (_req: Request, res: Response) => {
  try {
    res.json(ks.getDialogExamples());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Upload and preview (parse but don't save)
router.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }
    const format = req.body.format || undefined;
    const parsed = parseDialogFile(req.file.buffer, req.file.originalname, format);
    res.json({ dialogs: parsed, count: parsed.length });
  } catch (err: any) {
    res.status(400).json({ error: `Parse error: ${err.message}` });
  }
});

// Import (append parsed dialogs to examples.json)
router.post('/import', (req: Request, res: Response) => {
  try {
    const newDialogs = req.body.dialogs;
    if (!Array.isArray(newDialogs) || newDialogs.length === 0) {
      res.status(400).json({ error: 'No dialogs to import' });
      return;
    }
    const existing = ks.getDialogExamples() as any[];
    const merged = [...existing, ...newDialogs];
    ks.saveDialogExamples(merged);
    res.json({ success: true, total: merged.length, added: newDialogs.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
