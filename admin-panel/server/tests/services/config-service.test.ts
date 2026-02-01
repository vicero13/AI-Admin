import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { readConfig, writeConfig, updateConfigSection } from '../../src/services/config-service';
import { PATHS } from '../../src/utils/paths';

// Mock fs
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock paths to use temp dir
jest.mock('../../src/utils/paths', () => ({
  PATHS: {
    config: '/tmp/test-config/default.yaml',
    backups: '/tmp/test-config/.backups',
  },
}));

const sampleConfig = {
  server: { port: 3000, host: '0.0.0.0' },
  ai: { provider: 'anthropic', model: 'claude-3-sonnet-20240229', temperature: 0.7 },
  logging: { level: 'info' },
};

const sampleYaml = YAML.stringify(sampleConfig, { indent: 2 });

describe('config-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(sampleYaml);
    mockFs.writeFileSync.mockImplementation(() => {});
    mockFs.copyFileSync.mockImplementation(() => {});
    mockFs.mkdirSync.mockImplementation(() => undefined as any);
  });

  describe('readConfig', () => {
    it('should read and parse YAML config file', () => {
      const config = readConfig();

      expect(mockFs.readFileSync).toHaveBeenCalledWith(PATHS.config, 'utf-8');
      expect(config).toEqual(sampleConfig);
    });

    it('should throw when file does not exist', () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file');
      });

      expect(() => readConfig()).toThrow('ENOENT');
    });

    it('should throw on invalid YAML', () => {
      mockFs.readFileSync.mockReturnValue('invalid: yaml: [broken');

      expect(() => readConfig()).toThrow();
    });
  });

  describe('writeConfig', () => {
    it('should create backup and write YAML', () => {
      writeConfig(sampleConfig);

      expect(mockFs.copyFileSync).toHaveBeenCalledTimes(1);
      expect(mockFs.copyFileSync).toHaveBeenCalledWith(
        PATHS.config,
        expect.stringContaining('.bak'),
      );
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        PATHS.config,
        expect.any(String),
        'utf-8',
      );
    });

    it('should create backup directory if it does not exist', () => {
      mockFs.existsSync.mockReturnValue(false);

      writeConfig(sampleConfig);

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(PATHS.backups, { recursive: true });
    });

    it('should write valid YAML that can be parsed back', () => {
      let writtenContent = '';
      mockFs.writeFileSync.mockImplementation((_path, content) => {
        writtenContent = content as string;
      });

      writeConfig(sampleConfig);

      const parsed = YAML.parse(writtenContent);
      expect(parsed).toEqual(sampleConfig);
    });
  });

  describe('updateConfigSection', () => {
    it('should update a single section and write back', () => {
      const newAi = { provider: 'openai', model: 'gpt-4', temperature: 0.5 };

      const result = updateConfigSection('ai', newAi);

      expect(result.ai).toEqual(newAi);
      expect(result.server).toEqual(sampleConfig.server);
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });

    it('should add a new section if it does not exist', () => {
      const newSection = { key: 'value' };

      const result = updateConfigSection('newSection', newSection);

      expect((result as any).newSection).toEqual(newSection);
    });
  });
});
