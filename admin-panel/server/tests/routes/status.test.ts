import express from 'express';
import request from 'supertest';
import http from 'http';
import { EventEmitter } from 'events';
import statusRoutes from '../../src/routes/status';
import * as ks from '../../src/services/knowledge-service';

jest.mock('../../src/services/knowledge-service');
const mockKs = ks as jest.Mocked<typeof ks>;

// Mock http.get for proxy tests
jest.mock('http', () => {
  const original = jest.requireActual('http');
  return {
    ...original,
    get: jest.fn(),
  };
});
const mockHttp = http as jest.Mocked<typeof http>;

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/status', statusRoutes);
  return app;
}

describe('Status Routes', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/status/health', () => {
    it('should proxy health from main app', async () => {
      const mockResponse = new EventEmitter() as any;
      (mockHttp.get as jest.Mock).mockImplementation((_url: any, cb: any) => {
        cb(mockResponse);
        mockResponse.emit('data', JSON.stringify({ status: 'ok', uptime: 1000 }));
        mockResponse.emit('end');
        return { on: jest.fn() };
      });

      const res = await request(createApp()).get('/api/status/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('should return offline when main app is not running', async () => {
      (mockHttp.get as jest.Mock).mockImplementation((_url: any, _cb: any) => {
        const req = { on: jest.fn() };
        // Simulate error callback
        const errorCb = (_event: string, handler: Function) => {
          if (_event === 'error') handler(new Error('ECONNREFUSED'));
          return req;
        };
        req.on = errorCb as any;
        return req;
      });

      const res = await request(createApp()).get('/api/status/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('offline');
    });
  });

  describe('GET /api/status/knowledge-stats', () => {
    it('should return knowledge base statistics', async () => {
      mockKs.getMetadata.mockReturnValue({ version: '1.0' });
      mockKs.getFaqFiles.mockReturnValue(['general.json', 'pricing.json', 'booking.json']);
      mockKs.getPolicyFiles.mockReturnValue(['refund.json', 'rules.json']);
      mockKs.getDialogFiles.mockReturnValue(['examples.json']);

      const res = await request(createApp()).get('/api/status/knowledge-stats');

      expect(res.status).toBe(200);
      expect(res.body.faqCount).toBe(3);
      expect(res.body.policyCount).toBe(2);
      expect(res.body.dialogCount).toBe(1);
      expect(res.body.metadata).toEqual({ version: '1.0' });
    });

    it('should return 500 on error', async () => {
      mockKs.getMetadata.mockImplementation(() => { throw new Error('fail'); });

      const res = await request(createApp()).get('/api/status/knowledge-stats');

      expect(res.status).toBe(500);
    });
  });
});
