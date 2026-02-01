import fs from 'fs';
import path from 'path';
import {
  readJsonFile,
  writeJsonFile,
  listFiles,
  getBusinessInfo,
  saveBusinessInfo,
  getDialogExamples,
  saveDialogExamples,
} from '../../src/services/knowledge-service';

jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

jest.mock('../../src/utils/paths', () => ({
  PATHS: {
    knowledgeBase: '/tmp/test-kb',
    dialogs: '/tmp/test-kb/dialogs',
    dialogExamples: '/tmp/test-kb/dialogs/examples.json',
    faq: '/tmp/test-kb/faq',
    policies: '/tmp/test-kb/policies',
    backups: '/tmp/test-kb/.backups',
  },
}));

const sampleBusinessInfo = {
  name: 'Test Coworking',
  type: 'coworking',
  contacts: { phone: '+7 123' },
};

describe('knowledge-service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.existsSync.mockReturnValue(true);
    mockFs.writeFileSync.mockImplementation(() => {});
    mockFs.copyFileSync.mockImplementation(() => {});
    mockFs.mkdirSync.mockImplementation(() => undefined as any);
  });

  describe('readJsonFile', () => {
    it('should read and parse JSON file', () => {
      mockFs.readFileSync.mockReturnValue(JSON.stringify(sampleBusinessInfo));

      const result = readJsonFile('/tmp/test.json');

      expect(result).toEqual(sampleBusinessInfo);
    });

    it('should throw on invalid JSON', () => {
      mockFs.readFileSync.mockReturnValue('not json');

      expect(() => readJsonFile('/tmp/test.json')).toThrow();
    });

    it('should throw when file does not exist', () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT');
      });

      expect(() => readJsonFile('/tmp/missing.json')).toThrow('ENOENT');
    });
  });

  describe('writeJsonFile', () => {
    it('should create backup and write formatted JSON', () => {
      writeJsonFile('/tmp/test.json', sampleBusinessInfo);

      expect(mockFs.copyFileSync).toHaveBeenCalled();
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/tmp/test.json',
        expect.stringContaining('"name": "Test Coworking"'),
        'utf-8',
      );
    });

    it('should write with trailing newline', () => {
      let writtenContent = '';
      mockFs.writeFileSync.mockImplementation((_p, content) => {
        writtenContent = content as string;
      });

      writeJsonFile('/tmp/test.json', { key: 'value' });

      expect(writtenContent.endsWith('\n')).toBe(true);
    });

    it('should skip backup if source file does not exist', () => {
      mockFs.existsSync.mockImplementation((p) => {
        if (String(p).includes('.backups')) return true;
        return false;
      });

      writeJsonFile('/tmp/new-file.json', { data: true });

      expect(mockFs.copyFileSync).not.toHaveBeenCalled();
      expect(mockFs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('listFiles', () => {
    it('should return only .json files', () => {
      mockFs.readdirSync.mockReturnValue([
        'file1.json', 'file2.json', 'readme.md', 'data.txt',
      ] as any);

      const result = listFiles('/tmp/test-dir');

      expect(result).toEqual(['file1.json', 'file2.json']);
    });

    it('should return empty array for non-existent directory', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = listFiles('/tmp/nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('getBusinessInfo / saveBusinessInfo', () => {
    it('should read business-info.json from knowledge base', () => {
      mockFs.readFileSync.mockReturnValue(JSON.stringify(sampleBusinessInfo));

      const result = getBusinessInfo();

      expect(result).toEqual(sampleBusinessInfo);
      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining('business-info.json'),
        'utf-8',
      );
    });

    it('should save business-info.json', () => {
      saveBusinessInfo(sampleBusinessInfo);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('business-info.json'),
        expect.any(String),
        'utf-8',
      );
    });
  });

  describe('getDialogExamples / saveDialogExamples', () => {
    const sampleDialogs = [
      { exampleId: 'dialog-001', situation: 'Test', messages: [] },
    ];

    it('should read dialog examples', () => {
      mockFs.readFileSync.mockReturnValue(JSON.stringify(sampleDialogs));

      const result = getDialogExamples();

      expect(result).toEqual(sampleDialogs);
    });

    it('should save dialog examples', () => {
      saveDialogExamples(sampleDialogs);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('examples.json'),
        expect.any(String),
        'utf-8',
      );
    });
  });
});
