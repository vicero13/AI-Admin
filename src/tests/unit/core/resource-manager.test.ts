import fs from 'fs';
import { ResourceManager } from '../../../src/core/resource-manager';

jest.mock('../../../src/utils/logger', () => {
  const noop = jest.fn();
  return {
    Logger: jest.fn(() => ({ debug: noop, info: noop, warn: noop, error: noop })),
    logger: { debug: noop, info: noop, warn: noop, error: noop },
  };
});

jest.mock('fs');

describe('ResourceManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function createManager() {
    return new ResourceManager({
      basePath: '/app/resources',
      links: {
        website: 'https://example.com',
        prices: 'https://example.com/prices',
      },
      resources: [
        {
          id: 'presentation',
          type: 'file',
          path: 'presentation.pdf',
          description: 'Презентация офисов',
          triggers: ['расскажите об офисах', 'свободные офисы', 'сколько стоит аренда', 'презентация'],
        },
        {
          id: 'pricelist',
          type: 'link',
          url: 'https://example.com/prices',
          description: 'Прайс-лист',
          triggers: ['прайс', 'цены', 'стоимость'],
        },
        {
          id: 'welcome',
          type: 'template',
          content: 'Добрый день, {{name}}! Добро пожаловать в {{space}}.',
          description: 'Приветствие',
          triggers: [],
        },
      ],
    });
  }

  describe('findMatchingResource', () => {
    it('should find file resource by trigger', () => {
      const rm = createManager();
      const match = rm.findMatchingResource('Расскажите об офисах, пожалуйста');
      expect(match).not.toBeNull();
      expect(match!.resource.id).toBe('presentation');
      expect(match!.resource.type).toBe('file');
    });

    it('should find link resource by trigger', () => {
      const rm = createManager();
      const match = rm.findMatchingResource('Пришлите прайс');
      expect(match).not.toBeNull();
      expect(match!.resource.id).toBe('pricelist');
      expect(match!.resource.type).toBe('link');
    });

    it('should return null when no triggers match', () => {
      const rm = createManager();
      const match = rm.findMatchingResource('Как дела?');
      expect(match).toBeNull();
    });

    it('should be case-insensitive', () => {
      const rm = createManager();
      const match = rm.findMatchingResource('ПРЕЗЕНТАЦИЯ');
      expect(match).not.toBeNull();
      expect(match!.resource.id).toBe('presentation');
    });

    it('should prefer longer (more specific) triggers', () => {
      const rm = createManager();
      // "сколько стоит аренда" is longer than "стоимость"
      const match = rm.findMatchingResource('сколько стоит аренда офиса');
      expect(match).not.toBeNull();
      expect(match!.resource.id).toBe('presentation');
    });
  });

  describe('getResource', () => {
    it('should return resource by ID', () => {
      const rm = createManager();
      const resource = rm.getResource('presentation');
      expect(resource).toBeDefined();
      expect(resource!.type).toBe('file');
    });

    it('should return undefined for unknown ID', () => {
      const rm = createManager();
      expect(rm.getResource('nonexistent')).toBeUndefined();
    });
  });

  describe('getLink', () => {
    it('should return configured link', () => {
      const rm = createManager();
      expect(rm.getLink('website')).toBe('https://example.com');
      expect(rm.getLink('prices')).toBe('https://example.com/prices');
    });

    it('should return undefined for unknown link', () => {
      const rm = createManager();
      expect(rm.getLink('unknown')).toBeUndefined();
    });
  });

  describe('renderTemplate', () => {
    it('should render template with variables', () => {
      const rm = createManager();
      const result = rm.renderTemplate('welcome', { name: 'Иван', space: 'ElasticSpace' });
      expect(result).toBe('Добрый день, Иван! Добро пожаловать в ElasticSpace.');
    });

    it('should return null for non-template resources', () => {
      const rm = createManager();
      expect(rm.renderTemplate('presentation', {})).toBeNull();
    });

    it('should return null for unknown resources', () => {
      const rm = createManager();
      expect(rm.renderTemplate('unknown', {})).toBeNull();
    });
  });

  describe('isFileAvailable', () => {
    it('should return true when file exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      const rm = createManager();
      expect(rm.isFileAvailable('presentation')).toBe(true);
    });

    it('should return false when file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const rm = createManager();
      expect(rm.isFileAvailable('presentation')).toBe(false);
    });

    it('should return false for non-file resources', () => {
      const rm = createManager();
      expect(rm.isFileAvailable('pricelist')).toBe(false);
    });
  });

  describe('getFilePath', () => {
    it('should return absolute path for file resources', () => {
      const rm = createManager();
      const filePath = rm.getFilePath('presentation');
      expect(filePath).toContain('presentation.pdf');
    });

    it('should return null for non-file resources', () => {
      const rm = createManager();
      expect(rm.getFilePath('pricelist')).toBeNull();
    });
  });

  describe('listResources', () => {
    it('should return all resources', () => {
      const rm = createManager();
      const list = rm.listResources();
      expect(list).toHaveLength(3);
      expect(list.map((r) => r.id).sort()).toEqual(['pricelist', 'presentation', 'welcome'].sort());
    });
  });
});
