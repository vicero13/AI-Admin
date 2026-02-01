import fs from 'fs';
import path from 'path';
import os from 'os';
import YAML from 'yaml';
import * as configService from '../../src/admin/services/config-service';

describe('Config Service', () => {
  let tmpDir: string;
  let configPath: string;

  const sampleConfig = {
    server: { port: 3000, host: '0.0.0.0' },
    ai: { model: 'claude-3-sonnet', temperature: 0.7 },
    personality: { name: 'Валерия', style: 'friendly' },
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-test-'));
    configPath = path.join(tmpDir, 'default.yaml');
    fs.writeFileSync(configPath, YAML.stringify(sampleConfig));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('readConfig returns parsed YAML', () => {
    const config = configService.readConfig(configPath);
    expect(config.server).toEqual({ port: 3000, host: '0.0.0.0' });
    expect((config.personality as any).name).toBe('Валерия');
  });

  test('writeConfig creates backup and writes new config', () => {
    const newConfig = { ...sampleConfig, ai: { ...sampleConfig.ai, temperature: 0.9 } };
    configService.writeConfig(configPath, newConfig);

    const result = configService.readConfig(configPath);
    expect((result.ai as any).temperature).toBe(0.9);

    // Check backup was created
    const backupDir = path.join(tmpDir, '.backups');
    expect(fs.existsSync(backupDir)).toBe(true);
    const backups = fs.readdirSync(backupDir);
    expect(backups.length).toBe(1);
    expect(backups[0]).toContain('default.yaml');
  });

  test('readSection returns specific section', () => {
    const section = configService.readSection(configPath, 'server');
    expect(section).toEqual({ port: 3000, host: '0.0.0.0' });
  });

  test('readSection returns undefined for missing section', () => {
    const section = configService.readSection(configPath, 'nonexistent');
    expect(section).toBeUndefined();
  });

  test('writeSection updates specific section', () => {
    configService.writeSection(configPath, 'server', { port: 4000, host: 'localhost' });
    const config = configService.readConfig(configPath);
    expect((config.server as any).port).toBe(4000);
    expect((config.ai as any).temperature).toBe(0.7); // other sections unchanged
  });
});
