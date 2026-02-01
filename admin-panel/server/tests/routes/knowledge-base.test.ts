import express from 'express';
import request from 'supertest';
import knowledgeRoutes from '../../src/routes/knowledge-base';
import * as ks from '../../src/services/knowledge-service';

jest.mock('../../src/services/knowledge-service');
const mockKs = ks as jest.Mocked<typeof ks>;

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/knowledge', knowledgeRoutes);
  return app;
}

const sampleBusiness = { name: 'Test', type: 'coworking' };
const sampleServices = [{ serviceId: 'ws-1', name: 'Hot Desk' }];
const sampleTeam = [{ name: 'Anna', role: 'Manager' }];

describe('Knowledge Base Routes', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/knowledge/business-info', () => {
    it('should return business info', async () => {
      mockKs.getBusinessInfo.mockReturnValue(sampleBusiness);

      const res = await request(createApp()).get('/api/knowledge/business-info');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(sampleBusiness);
    });

    it('should return 500 on error', async () => {
      mockKs.getBusinessInfo.mockImplementation(() => { throw new Error('fail'); });

      const res = await request(createApp()).get('/api/knowledge/business-info');

      expect(res.status).toBe(500);
    });
  });

  describe('PUT /api/knowledge/business-info', () => {
    it('should save and return success', async () => {
      mockKs.saveBusinessInfo.mockImplementation(() => {});

      const res = await request(createApp())
        .put('/api/knowledge/business-info')
        .send(sampleBusiness);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockKs.saveBusinessInfo).toHaveBeenCalledWith(sampleBusiness);
    });
  });

  describe('GET /api/knowledge/services', () => {
    it('should return services', async () => {
      mockKs.getServices.mockReturnValue(sampleServices);

      const res = await request(createApp()).get('/api/knowledge/services');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(sampleServices);
    });
  });

  describe('PUT /api/knowledge/services', () => {
    it('should save services', async () => {
      mockKs.saveServices.mockImplementation(() => {});

      const res = await request(createApp())
        .put('/api/knowledge/services')
        .send(sampleServices);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/knowledge/team', () => {
    it('should return team', async () => {
      mockKs.getTeam.mockReturnValue(sampleTeam);

      const res = await request(createApp()).get('/api/knowledge/team');

      expect(res.status).toBe(200);
      expect(res.body).toEqual(sampleTeam);
    });
  });

  describe('GET /api/knowledge/faq', () => {
    it('should return all FAQ files and data', async () => {
      mockKs.getFaqFiles.mockReturnValue(['general.json', 'pricing.json']);
      mockKs.getFaqFile.mockImplementation((name) => ({ file: name }));

      const res = await request(createApp()).get('/api/knowledge/faq');

      expect(res.status).toBe(200);
      expect(res.body.files).toEqual(['general.json', 'pricing.json']);
      expect(res.body.data['general.json']).toEqual({ file: 'general.json' });
    });
  });

  describe('GET /api/knowledge/faq/:filename', () => {
    it('should return specific FAQ file', async () => {
      mockKs.getFaqFile.mockReturnValue({ questions: [] });

      const res = await request(createApp()).get('/api/knowledge/faq/general.json');

      expect(res.status).toBe(200);
      expect(mockKs.getFaqFile).toHaveBeenCalledWith('general.json');
    });
  });

  describe('PUT /api/knowledge/faq/:filename', () => {
    it('should save FAQ file', async () => {
      mockKs.saveFaqFile.mockImplementation(() => {});
      const data = { questions: [{ q: 'test', a: 'answer' }] };

      const res = await request(createApp())
        .put('/api/knowledge/faq/general.json')
        .send(data);

      expect(res.status).toBe(200);
      expect(mockKs.saveFaqFile).toHaveBeenCalledWith('general.json', data);
    });
  });

  describe('GET /api/knowledge/policies', () => {
    it('should return all policy files', async () => {
      mockKs.getPolicyFiles.mockReturnValue(['refund.json']);
      mockKs.getPolicyFile.mockReturnValue({ policy: 'refund' });

      const res = await request(createApp()).get('/api/knowledge/policies');

      expect(res.status).toBe(200);
      expect(res.body.files).toEqual(['refund.json']);
    });
  });

  describe('GET /api/knowledge/metadata', () => {
    it('should return metadata', async () => {
      mockKs.getMetadata.mockReturnValue({ version: '1.0' });

      const res = await request(createApp()).get('/api/knowledge/metadata');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ version: '1.0' });
    });
  });
});
