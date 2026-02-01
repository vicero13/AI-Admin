// ============================================================
// Media Resource Service — Управление медиа-ресурсами объектов (v2.0)
// Новое: CIAN links, per-location structure, presentation auto-send
// ============================================================

export interface MediaResourceConfig {
  enabled: boolean;
  basePath: string;
  objects: Record<string, ObjectMedia>;
  offices: Record<string, OfficeMedia>;
}

export interface ObjectMedia {
  name: string;
  photos: MediaItem[];
  videos: MediaItem[];
  tour3d?: string;
  presentation?: string;
  cianLink?: string;              // Ссылка на ЦИАН
  keywords: string[];
}

export interface OfficeMedia {
  name: string;
  address: string;
  photos: MediaItem[];
  keywords: string[];
}

export interface MediaItem {
  id: string;
  type: 'photo' | 'video';
  url?: string;
  filePath?: string;
  caption?: string;
  tags: string[];
}

export class MediaResourceService {
  private config: MediaResourceConfig;
  // Трекинг отправки презентации: conversationId → Set<objectId>
  private presentationsSent: Map<string, Set<string>> = new Map();

  constructor(config: MediaResourceConfig) {
    this.config = config;
  }

  getPhotosForObject(objectId: string): MediaItem[] {
    const obj = this.config.objects[objectId];
    return obj?.photos || [];
  }

  getVideosForObject(objectId: string): MediaItem[] {
    const obj = this.config.objects[objectId];
    return obj?.videos || [];
  }

  get3DTourLink(objectId: string): string | null {
    const obj = this.config.objects[objectId];
    return obj?.tour3d || null;
  }

  getPresentationLink(objectId: string): string | null {
    const obj = this.config.objects[objectId];
    return obj?.presentation || null;
  }

  getCianLink(objectId: string): string | null {
    const obj = this.config.objects[objectId];
    return obj?.cianLink || null;
  }

  getOfficePhotos(officeId: string): MediaItem[] {
    const office = this.config.offices[officeId];
    return office?.photos || [];
  }

  /**
   * Найти релевантные медиа по тексту сообщения
   */
  findRelevantMedia(message: string): MediaItem[] {
    if (!this.config.enabled) return [];

    const lower = message.toLowerCase();
    const results: MediaItem[] = [];

    for (const [, obj] of Object.entries(this.config.objects)) {
      const matched = obj.keywords.some((kw) => lower.includes(kw.toLowerCase()));
      if (matched) {
        results.push(...obj.photos.slice(0, 3));
        if (obj.videos.length > 0) {
          results.push(obj.videos[0]);
        }
        break;
      }
    }

    if (results.length === 0) {
      for (const [, office] of Object.entries(this.config.offices)) {
        const matched = office.keywords.some((kw) => lower.includes(kw.toLowerCase()));
        if (matched) {
          results.push(...office.photos.slice(0, 3));
          break;
        }
      }
    }

    return results;
  }

  /**
   * Найти объект по ключевым словам
   */
  findObjectByKeywords(message: string): { objectId: string; object: ObjectMedia } | null {
    const lower = message.toLowerCase();

    for (const [objectId, obj] of Object.entries(this.config.objects)) {
      const matched = obj.keywords.some((kw) => lower.includes(kw.toLowerCase()));
      if (matched) {
        return { objectId, object: obj };
      }
    }

    return null;
  }

  /**
   * Проверить, нужно ли отправить презентацию
   * Возвращает путь к презентации если ещё не отправлялась
   */
  shouldSendPresentation(conversationId: string, objectId: string): string | null {
    const obj = this.config.objects[objectId];
    if (!obj?.presentation) return null;

    // Уже отправляли?
    const sent = this.presentationsSent.get(conversationId);
    if (sent?.has(objectId)) return null;

    return obj.presentation;
  }

  /**
   * Отметить, что презентация отправлена
   */
  markPresentationSent(conversationId: string, objectId: string): void {
    let sent = this.presentationsSent.get(conversationId);
    if (!sent) {
      sent = new Set();
      this.presentationsSent.set(conversationId, sent);
    }
    sent.add(objectId);
  }

  /**
   * Проверить, отправляли ли уже презентацию
   */
  isPresentationSent(conversationId: string, objectId: string): boolean {
    const sent = this.presentationsSent.get(conversationId);
    return sent?.has(objectId) || false;
  }

  /**
   * Форматировать медиа-ссылки для текстового ответа
   */
  formatMediaMessage(items: MediaItem[], includeLinks: boolean = true): string {
    if (items.length === 0) return '';

    const parts: string[] = [];

    const photos = items.filter((i) => i.type === 'photo');
    const videos = items.filter((i) => i.type === 'video');

    if (photos.length > 0 && includeLinks) {
      const photoLinks = photos
        .filter((p) => p.url)
        .map((p) => p.caption ? `${p.caption}: ${p.url}` : p.url!);
      if (photoLinks.length > 0) {
        parts.push(`📸 Фотографии:\n${photoLinks.join('\n')}`);
      }
    }

    if (videos.length > 0 && includeLinks) {
      const videoLinks = videos
        .filter((v) => v.url)
        .map((v) => v.caption ? `${v.caption}: ${v.url}` : v.url!);
      if (videoLinks.length > 0) {
        parts.push(`🎥 Видео:\n${videoLinks.join('\n')}`);
      }
    }

    return parts.join('\n\n');
  }

  /**
   * Получить информацию о 3D-туре, презентации и ЦИАН для текстового ответа
   */
  formatResourceLinks(objectId: string): string {
    const parts: string[] = [];

    const tour = this.get3DTourLink(objectId);
    if (tour) {
      parts.push(`🏠 3D-тур: ${tour}`);
    }

    const presentation = this.getPresentationLink(objectId);
    if (presentation) {
      parts.push(`📄 Презентация: ${presentation}`);
    }

    const cian = this.getCianLink(objectId);
    if (cian) {
      parts.push(`🔗 ЦИАН: ${cian}`);
    }

    return parts.join('\n');
  }

  getObjectIds(): string[] {
    return Object.keys(this.config.objects);
  }

  getOfficeIds(): string[] {
    return Object.keys(this.config.offices);
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }
}
