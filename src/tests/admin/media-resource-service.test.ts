import { MediaResourceService, MediaResourceConfig } from '../../src/core/media-resource-service';

describe('MediaResourceService', () => {
  const defaultConfig: MediaResourceConfig = {
    enabled: true,
    basePath: './media',
    objects: {
      'office-a': {
        name: 'Офис А',
        photos: [
          { id: 'p1', type: 'photo', url: 'https://example.com/photo1.jpg', caption: 'Вид офиса', tags: ['офис'] },
          { id: 'p2', type: 'photo', url: 'https://example.com/photo2.jpg', caption: 'Переговорная', tags: ['переговорная'] },
        ],
        videos: [
          { id: 'v1', type: 'video', url: 'https://example.com/video1.mp4', caption: 'Видео-тур', tags: ['тур'] },
        ],
        tour3d: 'https://example.com/3d-tour-a',
        presentation: 'https://example.com/presentation-a.pdf',
        cianLink: 'https://cian.ru/office-a',
        keywords: ['офис а', 'офис a', 'первый офис'],
      },
      'office-b': {
        name: 'Офис Б',
        photos: [
          { id: 'p3', type: 'photo', url: 'https://example.com/photo3.jpg', caption: 'Офис Б', tags: ['офис'] },
        ],
        videos: [],
        keywords: ['офис б', 'второй офис'],
      },
    },
    offices: {
      'loc-1': {
        name: 'Локация на Арбате',
        address: 'ул. Арбат, 1',
        photos: [
          { id: 'op1', type: 'photo', url: 'https://example.com/office-photo.jpg', caption: 'Фасад', tags: ['фасад'] },
        ],
        keywords: ['арбат', 'локация 1'],
      },
    },
  };

  test('getPhotosForObject returns photos', () => {
    const service = new MediaResourceService(defaultConfig);
    const photos = service.getPhotosForObject('office-a');
    expect(photos).toHaveLength(2);
    expect(photos[0].url).toBe('https://example.com/photo1.jpg');
  });

  test('getPhotosForObject returns empty for unknown object', () => {
    const service = new MediaResourceService(defaultConfig);
    expect(service.getPhotosForObject('unknown')).toEqual([]);
  });

  test('getVideosForObject returns videos', () => {
    const service = new MediaResourceService(defaultConfig);
    const videos = service.getVideosForObject('office-a');
    expect(videos).toHaveLength(1);
    expect(videos[0].caption).toBe('Видео-тур');
  });

  test('getVideosForObject returns empty for object without videos', () => {
    const service = new MediaResourceService(defaultConfig);
    expect(service.getVideosForObject('office-b')).toEqual([]);
  });

  test('get3DTourLink returns link', () => {
    const service = new MediaResourceService(defaultConfig);
    expect(service.get3DTourLink('office-a')).toBe('https://example.com/3d-tour-a');
  });

  test('get3DTourLink returns null for missing', () => {
    const service = new MediaResourceService(defaultConfig);
    expect(service.get3DTourLink('office-b')).toBeNull();
    expect(service.get3DTourLink('unknown')).toBeNull();
  });

  test('getPresentationLink returns link', () => {
    const service = new MediaResourceService(defaultConfig);
    expect(service.getPresentationLink('office-a')).toBe('https://example.com/presentation-a.pdf');
  });

  test('getCianLink returns link', () => {
    const service = new MediaResourceService(defaultConfig);
    expect(service.getCianLink('office-a')).toBe('https://cian.ru/office-a');
  });

  test('getCianLink returns null for missing', () => {
    const service = new MediaResourceService(defaultConfig);
    expect(service.getCianLink('office-b')).toBeNull();
  });

  test('getOfficePhotos returns office photos', () => {
    const service = new MediaResourceService(defaultConfig);
    const photos = service.getOfficePhotos('loc-1');
    expect(photos).toHaveLength(1);
    expect(photos[0].caption).toBe('Фасад');
  });

  test('findRelevantMedia matches by object keywords', () => {
    const service = new MediaResourceService(defaultConfig);
    const media = service.findRelevantMedia('Покажите фото офис А');
    expect(media.length).toBeGreaterThan(0);
    expect(media.length).toBeLessThanOrEqual(4);
  });

  test('findRelevantMedia matches by office keywords', () => {
    const service = new MediaResourceService(defaultConfig);
    const media = service.findRelevantMedia('Как выглядит локация на Арбате?');
    expect(media.length).toBeGreaterThan(0);
    expect(media[0].caption).toBe('Фасад');
  });

  test('findRelevantMedia returns empty for no match', () => {
    const service = new MediaResourceService(defaultConfig);
    expect(service.findRelevantMedia('Привет')).toEqual([]);
  });

  test('findRelevantMedia returns empty when disabled', () => {
    const service = new MediaResourceService({ ...defaultConfig, enabled: false });
    expect(service.findRelevantMedia('офис а')).toEqual([]);
  });

  test('findObjectByKeywords finds correct object', () => {
    const service = new MediaResourceService(defaultConfig);
    const result = service.findObjectByKeywords('Расскажите про первый офис');
    expect(result).not.toBeNull();
    expect(result!.objectId).toBe('office-a');
    expect(result!.object.name).toBe('Офис А');
  });

  test('findObjectByKeywords returns null for no match', () => {
    const service = new MediaResourceService(defaultConfig);
    expect(service.findObjectByKeywords('Привет')).toBeNull();
  });

  test('formatMediaMessage formats correctly', () => {
    const service = new MediaResourceService(defaultConfig);
    const media = [
      { id: 'p1', type: 'photo' as const, url: 'https://example.com/1.jpg', caption: 'Фото 1', tags: [] },
      { id: 'v1', type: 'video' as const, url: 'https://example.com/1.mp4', caption: 'Видео', tags: [] },
    ];
    const result = service.formatMediaMessage(media);
    expect(result).toContain('📸');
    expect(result).toContain('🎥');
    expect(result).toContain('https://example.com/1.jpg');
    expect(result).toContain('https://example.com/1.mp4');
  });

  test('formatMediaMessage returns empty for no items', () => {
    const service = new MediaResourceService(defaultConfig);
    expect(service.formatMediaMessage([])).toBe('');
  });

  test('formatResourceLinks includes 3D tour, presentation, and CIAN', () => {
    const service = new MediaResourceService(defaultConfig);
    const links = service.formatResourceLinks('office-a');
    expect(links).toContain('🏠 3D-тур');
    expect(links).toContain('📄 Презентация');
    expect(links).toContain('🔗 ЦИАН');
  });

  test('getObjectIds returns all object IDs', () => {
    const service = new MediaResourceService(defaultConfig);
    expect(service.getObjectIds()).toEqual(['office-a', 'office-b']);
  });

  test('getOfficeIds returns all office IDs', () => {
    const service = new MediaResourceService(defaultConfig);
    expect(service.getOfficeIds()).toEqual(['loc-1']);
  });

  test('isEnabled returns correct value', () => {
    expect(new MediaResourceService(defaultConfig).isEnabled()).toBe(true);
    expect(new MediaResourceService({ ...defaultConfig, enabled: false }).isEnabled()).toBe(false);
  });

  // New: presentation tracking tests
  test('shouldSendPresentation returns path first time', () => {
    const service = new MediaResourceService(defaultConfig);
    const result = service.shouldSendPresentation('conv-1', 'office-a');
    expect(result).toBe('https://example.com/presentation-a.pdf');
  });

  test('shouldSendPresentation returns null after markPresentationSent', () => {
    const service = new MediaResourceService(defaultConfig);
    service.markPresentationSent('conv-1', 'office-a');
    expect(service.shouldSendPresentation('conv-1', 'office-a')).toBeNull();
  });

  test('isPresentationSent tracks correctly', () => {
    const service = new MediaResourceService(defaultConfig);
    expect(service.isPresentationSent('conv-1', 'office-a')).toBe(false);
    service.markPresentationSent('conv-1', 'office-a');
    expect(service.isPresentationSent('conv-1', 'office-a')).toBe(true);
    expect(service.isPresentationSent('conv-1', 'office-b')).toBe(false);
    expect(service.isPresentationSent('conv-2', 'office-a')).toBe(false);
  });

  test('shouldSendPresentation returns null for object without presentation', () => {
    const service = new MediaResourceService(defaultConfig);
    expect(service.shouldSendPresentation('conv-1', 'office-b')).toBeNull();
  });
});
