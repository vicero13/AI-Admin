import express from 'express';
import request from 'supertest';
import configRoutes from '../../src/routes/config';
import * as configService from '../../src/services/config-service';

jest.mock('../../src/services/config-service');
const mockConfigService = configService as jest.Mocked<typeof configService>;

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/config', configRoutes);
  return app;
}

const sampleConfig = {
  server: { port: 3000, host: '0.0.0.0' },
  ai: { provider: 'anthropic', model: 'claude-3-sonnet', temperature: 0.7 },
};

describe('GET /api/config', () => {
  it('should return config as JSON', async () => {
    mockConfigService.readConfig.mockReturnValue(sampleConfig);

    const res = await request(createApp()).get('/api/config');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(sampleConfig);
  });

  it('should return 500 on error', async () => {
    mockConfigService.readConfig.mockImplementation(() => {
      throw new Error('File not found');
    });

    const res = await request(createApp()).get('/api/config');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('File not found');
  });
});

describe('PUT /api/config', () => {
  it('should write config and return success', async () => {
    mockConfigService.writeConfig.mockImplementation(() => {});

    const res = await request(createApp())
      .put('/api/config')
      .send(sampleConfig);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockConfigService.writeConfig).toHaveBeenCalledWith(sampleConfig);
  });

  it('should return 500 on write error', async () => {
    mockConfigService.writeConfig.mockImplementation(() => {
      throw new Error('Write failed');
    });

    const res = await request(createApp())
      .put('/api/config')
      .send(sampleConfig);

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Write failed');
  });
});

describe('PATCH /api/config/:section', () => {
  it('should update a specific section', async () => {
    const updatedConfig = { ...sampleConfig, ai: { provider: 'openai' } };
    mockConfigService.updateConfigSection.mockReturnValue(updatedConfig as any);

    const res = await request(createApp())
      .patch('/api/config/ai')
      .send({ provider: 'openai' });

    expect(res.status).toBe(200);
    expect(mockConfigService.updateConfigSection).toHaveBeenCalledWith('ai', { provider: 'openai' });
  });

  it('should return 500 on update error', async () => {
    mockConfigService.updateConfigSection.mockImplementation(() => {
      throw new Error('Update failed');
    });

    const res = await request(createApp())
      .patch('/api/config/ai')
      .send({});

    expect(res.status).toBe(500);
  });
});
