// ============================================================
// Media Resource Service — Управление медиа-ресурсами объектов (v2.0)
// Медиа-файлы, презентации, 3D-туры, ЦИАН. Автоотправка клиентам.
// ============================================================

export enum MediaScope {
  SPECIFIC_OFFICE = 'specific_office',     // "покажите офис 311"
  SPECIFIC_LOCATION = 'specific_location', // "покажите чистые пруды"
  ALL_LOCATIONS = 'all_locations',         // "покажите всё что есть"
  NONE = 'none',
}

export interface MediaScopeResult {
  scope: MediaScope;
  locationIds: string[];
  officeIds: string[];
}

/** Одно сообщение для отправки (текст и/или файл) */
export interface MediaMessage {
  text?: string;
  attachment?: {
    type: 'file' | 'photo' | 'video';
    filePath: string;
    caption?: string;
  };
  delayMs: number;
}

/** Офис из knowledge-base (передаётся извне, чтобы не было circular deps) */
export interface OfficeInfo {
  id: string;
  locationId: string;
  number: string;
  capacity: number;
  pricePerMonth: number;
  link?: string;
  availableFrom: string;
  status: string;
}

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
  videos: MediaItem[];
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

  /**
   * Обновить конфиг медиа (hot-reload без пересоздания объекта)
   */
  updateConfig(config: MediaResourceConfig): void {
    this.config = config;
    // Не сбрасываем presentationsSent — трекинг отправок сохраняется
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
   * Найти релевантные медиа по тексту сообщения.
   * Ищет сначала по объектам (локациям), потом по отдельным офисам.
   * Для офисов ищет по keywords + по номеру офиса из officeId (cp-311 → "311").
   */
  findRelevantMedia(message: string): MediaItem[] {
    if (!this.config.enabled) return [];

    const lower = message.toLowerCase();
    const results: MediaItem[] = [];

    // 1. Поиск по объектам (локациям): keywords match
    for (const [, obj] of Object.entries(this.config.objects)) {
      const matched = obj.keywords.some((kw) => kw && lower.includes(kw.toLowerCase()));
      if (matched) {
        results.push(...obj.photos.slice(0, 5));
        if (obj.videos.length > 0) {
          results.push(obj.videos[0]);
        }
        break;
      }
    }

    // 2. Поиск по конкретным офисам: keywords + номер из officeId
    if (results.length === 0) {
      for (const [officeId, office] of Object.entries(this.config.offices)) {
        // Извлечь номер офиса из id (cp-311 → "311", sokol-4-120 → "120")
        const officeNumber = officeId.replace(/^[a-z]+-/, '');
        const matchedByKeyword = office.keywords.some((kw) => kw && lower.includes(kw.toLowerCase()));
        const matchedByNumber = officeNumber && lower.includes(officeNumber);

        if (matchedByKeyword || matchedByNumber) {
          if (office.photos.length > 0) results.push(...office.photos.slice(0, 5));
          if (office.videos && office.videos.length > 0) results.push(...office.videos);
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

  /** Получить имя объекта по id */
  getObjectName(objectId: string): string {
    return this.config.objects[objectId]?.name || objectId;
  }

  // ============================================================
  // Scope detection: определить что именно хочет клиент
  // ============================================================

  /**
   * Определить scope медиа-запроса по тексту сообщения и истории.
   * @param text — текст сообщения клиента
   * @param offices — список офисов из knowledge base
   * @param conversationHistory — последние сообщения из истории (для определения контекста)
   */
  detectMediaScope(text: string, offices: OfficeInfo[], conversationHistory?: string[]): MediaScopeResult {
    const lower = text.toLowerCase();

    // 1. "Всё что есть" / "все материалы"
    const allPatterns = [
      'всё что есть', 'все что есть', 'все материалы', 'всю информацию',
      'все локации', 'все объекты', 'покажите всё', 'покажите все',
      'присылайте всё', 'присылайте все', 'давайте всё', 'давайте все',
    ];
    if (allPatterns.some(p => lower.includes(p))) {
      const allLocationIds = Object.keys(this.config.objects);
      return { scope: MediaScope.ALL_LOCATIONS, locationIds: allLocationIds, officeIds: [] };
    }

    // 2. Конкретный офис по номеру: "311", "офис 311"
    const officeNumberMatch = lower.match(/(?:офис|кабинет|комнат|номер|№|#)?\s*(\d{3})\b/);
    if (officeNumberMatch) {
      const num = officeNumberMatch[1];
      // Найти officeId в media config
      for (const [officeId] of Object.entries(this.config.offices)) {
        const officeNumber = officeId.replace(/^[a-z]+-/, '');
        if (officeNumber === num) {
          return { scope: MediaScope.SPECIFIC_OFFICE, locationIds: [], officeIds: [officeId] };
        }
      }
      // Даже если нет в media — ищем в offices для locationId
      const matchedOffice = offices.find(o => o.number.includes(num) || o.id.includes(num));
      if (matchedOffice) {
        return { scope: MediaScope.SPECIFIC_OFFICE, locationIds: [matchedOffice.locationId], officeIds: [matchedOffice.id] };
      }
    }

    // 3. Конкретная локация по keywords из текущего сообщения
    for (const [locationId, obj] of Object.entries(this.config.objects)) {
      const matched = obj.keywords.some(kw => kw && lower.includes(kw.toLowerCase()));
      if (matched) {
        return { scope: MediaScope.SPECIFIC_LOCATION, locationIds: [locationId], officeIds: [] };
      }
    }

    // 4. Fallback: искать локацию/офис в ИСТОРИИ разговора (последние сообщения)
    //    Клиент пишет "можете фото/видео отправить?" без уточнения — смотрим о чём шла речь
    if (conversationHistory && conversationHistory.length > 0) {
      // Собираем всю историю в один текст (последние 5 сообщений)
      const historyText = conversationHistory.slice(-5).join(' ').toLowerCase();

      // Ищем номера офисов в истории
      const historyOfficeMatch = historyText.match(/офис\s*(?:номер|№|#)?\s*(\d{3})/);
      if (historyOfficeMatch) {
        const num = historyOfficeMatch[1];
        for (const [officeId] of Object.entries(this.config.offices)) {
          const officeNumber = officeId.replace(/^[a-z]+-/, '');
          if (officeNumber === num) {
            return { scope: MediaScope.SPECIFIC_OFFICE, locationIds: [], officeIds: [officeId] };
          }
        }
      }

      // Ищем локацию в истории
      for (const [locationId, obj] of Object.entries(this.config.objects)) {
        const matched = obj.keywords.some(kw => kw && historyText.includes(kw.toLowerCase()));
        if (matched) {
          return { scope: MediaScope.SPECIFIC_LOCATION, locationIds: [locationId], officeIds: [] };
        }
      }
    }

    return { scope: MediaScope.NONE, locationIds: [], officeIds: [] };
  }

  // ============================================================
  // Build media messages: собрать массив сообщений для отправки
  // ============================================================

  /**
   * Построить массив медиа-сообщений для отправки клиенту.
   * @returns массив MediaMessage + текстовое описание для AI
   */
  buildMediaMessages(
    scopeResult: MediaScopeResult,
    offices: OfficeInfo[],
    conversationId: string,
  ): { messages: MediaMessage[]; description: string } {
    if (scopeResult.scope === MediaScope.NONE) {
      return { messages: [], description: '' };
    }

    switch (scopeResult.scope) {
      case MediaScope.SPECIFIC_OFFICE:
        return this.buildOfficeMedia(scopeResult.officeIds, scopeResult.locationIds, offices, conversationId);
      case MediaScope.SPECIFIC_LOCATION:
        return this.buildLocationMedia(scopeResult.locationIds, offices, conversationId);
      case MediaScope.ALL_LOCATIONS:
        return this.buildAllLocationsMedia(offices, conversationId);
      default:
        return { messages: [], description: '' };
    }
  }

  private buildOfficeMedia(
    officeIds: string[],
    locationIds: string[],
    offices: OfficeInfo[],
    conversationId: string = '',
  ): { messages: MediaMessage[]; description: string } {
    const messages: MediaMessage[] = [];
    const descParts: string[] = [];

    // Собираем locationIds из офисов (для отправки презентации локации)
    const resolvedLocationIds = new Set(locationIds);
    for (const officeId of officeIds) {
      const office = offices.find(o => o.id === officeId);
      if (office) resolvedLocationIds.add(office.locationId);
    }

    for (const officeId of officeIds) {
      const officeMedia = this.config.offices[officeId];
      if (officeMedia) {
        // Фото офиса
        for (const photo of officeMedia.photos) {
          if (photo.filePath) {
            messages.push({ attachment: { type: 'photo', filePath: photo.filePath, caption: photo.caption || `${officeMedia.name}` }, delayMs: 500 });
          }
        }
        // Видео офиса
        if (officeMedia.videos) {
          for (const video of officeMedia.videos) {
            if (video.filePath) {
              messages.push({ attachment: { type: 'video', filePath: video.filePath, caption: video.caption || `Видео ${officeMedia.name}` }, delayMs: 500 });
            }
          }
        }
        descParts.push(`${officeMedia.photos.length} фото, ${officeMedia.videos?.length || 0} видео для ${officeMedia.name}`);
      }
    }

    // Отправить презентацию локации (если есть и ещё не отправлялась)
    if (conversationId) {
      for (const locId of resolvedLocationIds) {
        const obj = this.config.objects[locId];
        if (obj?.presentation && !this.isPresentationSent(conversationId, locId)) {
          messages.push({
            attachment: { type: 'file', filePath: obj.presentation, caption: `Презентация ${obj.name}` },
            delayMs: 1000,
          });
          this.markPresentationSent(conversationId, locId);
          descParts.push(`презентация ${obj.name}`);
        }
      }
    }

    // Если для офиса нет своего медиа — отправить медиа локации
    if (messages.length === 0 && locationIds.length > 0) {
      return this.buildLocationMedia(locationIds, offices, conversationId);
    }

    return { messages, description: descParts.join('; ') };
  }

  private buildLocationMedia(
    locationIds: string[],
    offices: OfficeInfo[],
    conversationId: string,
  ): { messages: MediaMessage[]; description: string } {
    const messages: MediaMessage[] = [];
    const descParts: string[] = [];

    for (const locationId of locationIds) {
      const obj = this.config.objects[locationId];
      if (!obj) continue;

      const locationName = obj.name;

      // 1. Презентация (если ещё не отправляли)
      if (obj.presentation && !this.isPresentationSent(conversationId, locationId)) {
        messages.push({
          attachment: { type: 'file', filePath: obj.presentation, caption: `Презентация ${locationName}` },
          delayMs: 1000,
        });
        this.markPresentationSent(conversationId, locationId);
        descParts.push(`презентация ${locationName}`);
      }

      // 2. Видео общих зон
      for (const video of obj.videos) {
        if (video.filePath) {
          messages.push({
            attachment: { type: 'video', filePath: video.filePath, caption: video.caption || `Видео ${locationName}` },
            delayMs: 1000,
          });
        }
      }
      if (obj.videos.length > 0) descParts.push(`${obj.videos.length} видео ${locationName}`);

      // 3. Фото общих зон (до 5)
      const photosToSend = obj.photos.slice(0, 5);
      for (const photo of photosToSend) {
        if (photo.filePath) {
          messages.push({
            attachment: { type: 'photo', filePath: photo.filePath, caption: photo.caption },
            delayMs: 300,
          });
        }
      }
      if (photosToSend.length > 0) descParts.push(`${photosToSend.length} фото ${locationName}`);

      // 4. Текст: список офисов на этой локации
      const locationOffices = offices.filter(o => o.locationId === locationId && o.status === 'free');
      if (locationOffices.length > 0) {
        const officeLines = locationOffices.map(o => {
          const price = `${(o.pricePerMonth / 1000).toFixed(0)} тыс. ₽/мес`;
          const avail = o.availableFrom === 'available' ? 'свободен' : `с ${o.availableFrom}`;
          const cian = o.link ? `\nЦИАН: ${o.link}` : '';
          return `• ${o.number} — ${o.capacity} мест, ${price}, ${avail}${cian}`;
        });

        // Добавить ссылки (3D тур, ЦИАН)
        const links: string[] = [];
        if (obj.tour3d) links.push(`🏠 3D-тур: ${obj.tour3d}`);
        if (obj.cianLink) links.push(`🔗 ЦИАН: ${obj.cianLink}`);
        const linksText = links.length > 0 ? '\n\n' + links.join('\n') : '';

        messages.push({
          text: `📋 Офисы на ${locationName}:\n\n${officeLines.join('\n')}${linksText}`,
          delayMs: 1500,
        });
      }

      // 5. Для каждого офиса с медиа на этой локации — его медиа
      for (const [officeId, officeMedia] of Object.entries(this.config.offices)) {
        // Проверить что офис принадлежит этой локации
        const knownOffice = offices.find(o => o.id === officeId);
        if (!knownOffice || knownOffice.locationId !== locationId) continue;

        const hasMedia = (officeMedia.photos?.length > 0) || (officeMedia.videos?.length > 0);
        if (!hasMedia) continue;

        // Фото + видео конкретного офиса
        for (const photo of officeMedia.photos || []) {
          if (photo.filePath) {
            messages.push({ attachment: { type: 'photo', filePath: photo.filePath, caption: `${officeMedia.name}` }, delayMs: 300 });
          }
        }
        for (const video of officeMedia.videos || []) {
          if (video.filePath) {
            messages.push({ attachment: { type: 'video', filePath: video.filePath, caption: `Видео ${officeMedia.name}` }, delayMs: 500 });
          }
        }
      }
    }

    return { messages, description: descParts.join(', ') };
  }

  private buildAllLocationsMedia(
    offices: OfficeInfo[],
    conversationId: string,
  ): { messages: MediaMessage[]; description: string } {
    const allMessages: MediaMessage[] = [];
    const allDesc: string[] = [];

    const locationIds = Object.keys(this.config.objects);

    for (const locationId of locationIds) {
      const { messages, description } = this.buildLocationMedia([locationId], offices, conversationId);
      if (messages.length > 0) {
        allMessages.push(...messages);
        if (description) allDesc.push(description);
      }
    }

    return { messages: allMessages, description: allDesc.join('; ') };
  }
}
