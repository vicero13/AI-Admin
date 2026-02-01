import { Router, Request, Response } from 'express';
import http from 'http';
import * as ks from '../services/knowledge-service';

const router = Router();

const MAIN_APP_URL = process.env.MAIN_APP_URL || 'http://localhost:3000';

function proxyGet(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ raw: data }); }
      });
    }).on('error', (err) => reject(err));
  });
}

router.get('/health', async (_req: Request, res: Response) => {
  try {
    const health = await proxyGet(`${MAIN_APP_URL}/health`);
    res.json(health);
  } catch {
    res.json({ status: 'offline', error: 'Main application is not running' });
  }
});

router.get('/metrics', async (_req: Request, res: Response) => {
  try {
    const metrics = await proxyGet(`${MAIN_APP_URL}/metrics`);
    res.json(metrics);
  } catch {
    res.json({ status: 'offline', error: 'Main application is not running' });
  }
});

router.get('/knowledge-stats', (_req: Request, res: Response) => {
  try {
    const metadata = ks.getMetadata();
    const faqFiles = ks.getFaqFiles();
    const policyFiles = ks.getPolicyFiles();
    const dialogFiles = ks.getDialogFiles();
    res.json({ metadata, faqCount: faqFiles.length, policyCount: policyFiles.length, dialogCount: dialogFiles.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
