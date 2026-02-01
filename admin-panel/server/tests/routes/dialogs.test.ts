import express from 'express';
import request from 'supertest';
import dialogRoutes from '../../src/routes/dialogs';
import * as ks from '../../src/services/knowledge-service';
import * as parser from '../../src/services/dialog-parser';

jest.mock('../../src/services/knowledge-service');
jest.mock('../../src/services/dialog-parser');

const mockKs = ks as jest.Mocked<typeof ks>;
const mockParser = parser as jest.Mocked<typeof parser>;

function createApp() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));
  app.use('/api/dialogs', dialogRoutes);
  return app;
}

const sampleDialog = {
  exampleId: 'dialog-test',
  situation: 'Test',
  clientType: 'new',
  messages: [{ role: 'client' as const, text: 'Hello' }],
  outcome: 'neutral',
  quality: 0.8,
  learnings: [],
  keyPhrases: [],
  tags: ['imported'],
  metadata: {},
};

describe('Dialog Routes', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/dialogs', () => {
    it('should list dialog files', async () => {
      mockKs.getDialogFiles.mockReturnValue(['examples.json', 'booking-success.json']);

      const res = await request(createApp()).get('/api/dialogs');

      expect(res.status).toBe(200);
      expect(res.body.files).toEqual(['examples.json', 'booking-success.json']);
    });
  });

  describe('GET /api/dialogs/examples', () => {
    it('should return dialog examples', async () => {
      mockKs.getDialogExamples.mockReturnValue([sampleDialog]);

      const res = await request(createApp()).get('/api/dialogs/examples');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([sampleDialog]);
    });
  });

  describe('POST /api/dialogs/upload', () => {
    it('should parse uploaded JSON file and return preview', async () => {
      mockParser.parseDialogFile.mockReturnValue([sampleDialog]);

      const res = await request(createApp())
        .post('/api/dialogs/upload')
        .attach('file', Buffer.from('[]'), 'test.json');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.dialogs).toEqual([sampleDialog]);
    });

    it('should return 400 when no file uploaded', async () => {
      const res = await request(createApp()).post('/api/dialogs/upload');

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No file uploaded');
    });

    it('should return 400 on parse error', async () => {
      mockParser.parseDialogFile.mockImplementation(() => {
        throw new Error('Invalid format');
      });

      const res = await request(createApp())
        .post('/api/dialogs/upload')
        .attach('file', Buffer.from('bad data'), 'test.json');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Parse error');
    });
  });

  describe('POST /api/dialogs/import', () => {
    it('should merge new dialogs with existing and save', async () => {
      const existing = [{ exampleId: 'old-1' }];
      mockKs.getDialogExamples.mockReturnValue(existing);
      mockKs.saveDialogExamples.mockImplementation(() => {});

      const res = await request(createApp())
        .post('/api/dialogs/import')
        .send({ dialogs: [sampleDialog] });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.added).toBe(1);
      expect(res.body.total).toBe(2);
      expect(mockKs.saveDialogExamples).toHaveBeenCalledWith([
        ...existing,
        sampleDialog,
      ]);
    });

    it('should return 400 when dialogs array is empty', async () => {
      const res = await request(createApp())
        .post('/api/dialogs/import')
        .send({ dialogs: [] });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('No dialogs to import');
    });

    it('should return 400 when dialogs is not an array', async () => {
      const res = await request(createApp())
        .post('/api/dialogs/import')
        .send({ dialogs: 'not array' });

      expect(res.status).toBe(400);
    });
  });
});
