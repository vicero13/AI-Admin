import { Router, Request, Response } from 'express';
import * as ks from '../services/knowledge-service';

const router = Router();

// Business info
router.get('/business-info', (_req: Request, res: Response) => {
  try { res.json(ks.getBusinessInfo()); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put('/business-info', (req: Request, res: Response) => {
  try { ks.saveBusinessInfo(req.body); res.json({ success: true }); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Services
router.get('/services', (_req: Request, res: Response) => {
  try { res.json(ks.getServices()); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put('/services', (req: Request, res: Response) => {
  try { ks.saveServices(req.body); res.json({ success: true }); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Team
router.get('/team', (_req: Request, res: Response) => {
  try { res.json(ks.getTeam()); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put('/team', (req: Request, res: Response) => {
  try { ks.saveTeam(req.body); res.json({ success: true }); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Metadata
router.get('/metadata', (_req: Request, res: Response) => {
  try { res.json(ks.getMetadata()); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

// FAQ
router.get('/faq', (_req: Request, res: Response) => {
  try {
    const files = ks.getFaqFiles();
    const data: Record<string, unknown> = {};
    for (const f of files) { data[f] = ks.getFaqFile(f); }
    res.json({ files, data });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/faq/:filename', (req: Request, res: Response) => {
  try { res.json(ks.getFaqFile(req.params.filename)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put('/faq/:filename', (req: Request, res: Response) => {
  try { ks.saveFaqFile(req.params.filename, req.body); res.json({ success: true }); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Policies
router.get('/policies', (_req: Request, res: Response) => {
  try {
    const files = ks.getPolicyFiles();
    const data: Record<string, unknown> = {};
    for (const f of files) { data[f] = ks.getPolicyFile(f); }
    res.json({ files, data });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.get('/policies/:filename', (req: Request, res: Response) => {
  try { res.json(ks.getPolicyFile(req.params.filename)); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

router.put('/policies/:filename', (req: Request, res: Response) => {
  try { ks.savePolicyFile(req.params.filename, req.body); res.json({ success: true }); }
  catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
