// ============================================================
// Knowledge Base - Модуль базы знаний AI-агента
// ============================================================

import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';

import {
  BusinessInfo,
  ServiceInfo,
  FAQItem,
  Policy,
  DialogExample,
  KnowledgeItem,
  KnowledgeSearchResult,
  KnowledgeType,
  KnowledgeCategory,
} from '../types';

// --- Interfaces ---

export interface KnowledgeBaseConfig {
  basePath: string;
  confidenceThreshold: number;
  autoReload: boolean;
  reloadIntervalMs?: number;
}

export interface KnowledgeBaseStats {
  businessInfoLoaded: boolean;
  servicesCount: number;
  faqCount: number;
  policiesCount: number;
  dialogExamplesCount: number;
  knowledgeItemsCount: number;
  lastLoadedAt: number;
  loadErrors: string[];
}

// --- KnowledgeBase Class ---

export class KnowledgeBase {
  private config: KnowledgeBaseConfig;

  private businessInfo: BusinessInfo | null = null;
  private teamInfo: Record<string, unknown> | null = null;
  private metadata: Record<string, unknown> | null = null;
  private services: ServiceInfo[] = [];
  private faq: FAQItem[] = [];
  private policies: Policy[] = [];
  private dialogExamples: DialogExample[] = [];
  private knowledgeItems: KnowledgeItem[] = [];

  private lastLoadedAt: number = 0;
  private loadErrors: string[] = [];
  private reloadTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: KnowledgeBaseConfig) {
    this.config = config;
  }

  // --- Public API ---

  /**
   * Инициализация: загрузка всех данных из файлов
   */
  async initialize(): Promise<void> {
    await this.reload();

    if (this.config.autoReload && this.config.reloadIntervalMs) {
      this.reloadTimer = setInterval(() => {
        this.reload().catch((err) => {
          this.loadErrors.push(`Auto-reload failed: ${String(err)}`);
        });
      }, this.config.reloadIntervalMs);
    }
  }

  /**
   * Остановка (очистка таймеров)
   */
  destroy(): void {
    if (this.reloadTimer) {
      clearInterval(this.reloadTimer);
      this.reloadTimer = null;
    }
  }

  /**
   * Перезагрузка всех файлов из директории
   */
  async reload(): Promise<void> {
    this.loadErrors = [];

    this.businessInfo = await this.loadJsonFile<BusinessInfo>(
      path.join(this.config.basePath, 'business-info.json'),
    );

    this.teamInfo = await this.loadJsonFile<Record<string, unknown>>(
      path.join(this.config.basePath, 'team.json'),
    );

    this.metadata = await this.loadJsonFile<Record<string, unknown>>(
      path.join(this.config.basePath, 'metadata.json'),
    );

    this.services = (await this.loadJsonFile<ServiceInfo[]>(
      path.join(this.config.basePath, 'services.json'),
    )) ?? [];

    this.faq = (await this.loadJsonFilesFromDir<FAQItem[]>(
      path.join(this.config.basePath, 'faq'),
    )).flat();

    this.policies = (await this.loadJsonFilesFromDir<Policy[]>(
      path.join(this.config.basePath, 'policies'),
    )).flat();

    this.dialogExamples = (await this.loadJsonFilesFromDir<DialogExample[]>(
      path.join(this.config.basePath, 'dialogs'),
    )).flat();

    this.knowledgeItems = this.buildKnowledgeItems();
    this.lastLoadedAt = Date.now();
  }

  /**
   * Поиск по всей базе знаний с fuzzy-matching
   */
  search(query: string, limit: number = 10): KnowledgeSearchResult[] {
    const normalizedQuery = query.toLowerCase().trim();
    const queryWords = normalizedQuery.split(/\s+/).filter((w) => w.length > 1);

    if (queryWords.length === 0) {
      return [];
    }

    const results: KnowledgeSearchResult[] = [];

    for (const item of this.knowledgeItems) {
      const { relevance, matchedTerms, snippet } = this.calculateRelevance(
        queryWords,
        normalizedQuery,
        item,
      );

      if (relevance > 0) {
        results.push({ item, relevance, matchedTerms, snippet });
      }
    }

    results.sort((a, b) => b.relevance - a.relevance);
    return results.slice(0, limit);
  }

  /**
   * Возвращает наиболее релевантные элементы базы знаний
   */
  findRelevant(query: string, limit: number = 5): KnowledgeSearchResult[] {
    const results = this.search(query, limit * 2);
    // Оставляем только результаты с relevance > 0.1
    return results.filter((r) => r.relevance > 0.1).slice(0, limit);
  }

  /**
   * Есть ли информация по данному запросу (confidence > threshold)
   */
  hasInformation(query: string): boolean {
    return this.getConfidence(query) >= this.config.confidenceThreshold;
  }

  /**
   * Возвращает уверенность (0-1) что в базе есть ответ на запрос
   */
  getConfidence(query: string): number {
    const results = this.search(query, 1);
    if (results.length === 0) {
      return 0;
    }
    return results[0].relevance;
  }

  /**
   * Получить информацию о бизнесе
   */
  getBusinessInfo(): BusinessInfo | null {
    return this.businessInfo;
  }

  /**
   * Получить информацию о команде
   */
  getTeam(): Record<string, unknown> | null {
    return this.teamInfo;
  }

  /**
   * Получить метаданные
   */
  getMetadata(): Record<string, unknown> | null {
    return this.metadata;
  }

  /**
   * Получить список услуг
   */
  getServices(): ServiceInfo[] {
    return [...this.services];
  }

  /**
   * Получить FAQ
   */
  getFAQ(): FAQItem[] {
    return [...this.faq];
  }

  /**
   * Получить политики
   */
  getPolicies(): Policy[] {
    return [...this.policies];
  }

  /**
   * Получить примеры диалогов
   */
  getDialogExamples(): DialogExample[] {
    return [...this.dialogExamples];
  }

  /**
   * Статистика базы знаний
   */
  getStats(): KnowledgeBaseStats {
    return {
      businessInfoLoaded: this.businessInfo !== null,
      servicesCount: this.services.length,
      faqCount: this.faq.length,
      policiesCount: this.policies.length,
      dialogExamplesCount: this.dialogExamples.length,
      knowledgeItemsCount: this.knowledgeItems.length,
      lastLoadedAt: this.lastLoadedAt,
      loadErrors: [...this.loadErrors],
    };
  }

  // --- Private: File Loading ---

  private async loadJsonFile<T>(filePath: string): Promise<T | null> {
    try {
      await fsp.access(filePath);
      const raw = await fsp.readFile(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    } catch (err: any) {
      if (err?.code === 'ENOENT') {
        this.loadErrors.push(`File not found: ${filePath}`);
      } else {
        this.loadErrors.push(`Error loading ${filePath}: ${String(err)}`);
      }
      return null;
    }
  }

  private async loadJsonFilesFromDir<T>(dirPath: string): Promise<T[]> {
    const results: T[] = [];
    try {
      await fsp.access(dirPath);
      const entries = await fsp.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          const subFiles = (await fsp.readdir(fullPath)).filter((f) => f.endsWith('.json'));
          for (const file of subFiles) {
            const data = await this.loadJsonFile<T>(path.join(fullPath, file));
            if (data !== null) {
              results.push(data);
            }
          }
        } else if (entry.name.endsWith('.json')) {
          const data = await this.loadJsonFile<T>(fullPath);
          if (data !== null) {
            results.push(data);
          }
        }
      }
    } catch (err: any) {
      if (err?.code === 'ENOENT') {
        this.loadErrors.push(`Directory not found: ${dirPath}`);
      } else {
        this.loadErrors.push(`Error reading directory ${dirPath}: ${String(err)}`);
      }
    }
    return results;
  }

  // --- Private: Knowledge Item Building ---

  private buildKnowledgeItems(): KnowledgeItem[] {
    const items: KnowledgeItem[] = [];
    const now = Date.now();

    // Business Info
    if (this.businessInfo) {
      items.push({
        id: 'business-info',
        type: KnowledgeType.BUSINESS_INFO,
        category: KnowledgeCategory.GENERAL,
        content: this.businessInfo,
        title: this.businessInfo.name,
        description: this.businessInfo.description,
        tags: ['бизнес', 'информация', 'контакты', 'адрес', 'часы работы'],
        keywords: this.extractBusinessKeywords(this.businessInfo),
        confidence: 1.0,
        lastVerified: now,
        usageCount: 0,
        metadata: {},
      });
    }

    // Services
    for (const service of this.services) {
      // Извлекаем количество мест из metadata или названия
      const seats = (service.metadata as any)?.seats;
      const seatsKeywords: string[] = [];
      if (seats) {
        seatsKeywords.push(
          `${seats} человек`,
          `${seats} сотрудников`,
          `${seats} мест`,
          `на ${seats}`,
          `${seats} чел`,
        );
      }

      items.push({
        id: `service-${service.serviceId}`,
        type: KnowledgeType.SERVICE,
        category: KnowledgeCategory.SERVICES,
        content: service,
        title: service.name,
        description: service.description,
        tags: service.tags,
        keywords: [
          service.name.toLowerCase(),
          service.category.toLowerCase(),
          service.description.toLowerCase(),
          ...service.features.map((f) => f.toLowerCase()),
          ...service.tags.map((t) => t.toLowerCase()),
          ...seatsKeywords,
        ],
        confidence: 1.0,
        lastVerified: now,
        usageCount: 0,
        metadata: {},
      });
    }

    // FAQ
    for (const faqItem of this.faq) {
      items.push({
        id: `faq-${faqItem.faqId}`,
        type: KnowledgeType.FAQ,
        category: faqItem.category,
        content: faqItem,
        title: faqItem.question,
        description: faqItem.answer,
        tags: faqItem.tags,
        keywords: [
          ...faqItem.tags.map((t) => t.toLowerCase()),
          ...this.extractWords(faqItem.question),
        ],
        alternativeQuestions: faqItem.alternativeQuestions,
        confidence: 1.0,
        lastVerified: now,
        usageCount: 0,
        metadata: { popularity: faqItem.popularity },
      });
    }

    // Policies
    for (const policy of this.policies) {
      items.push({
        id: `policy-${policy.policyId}`,
        type: KnowledgeType.POLICY,
        category: KnowledgeCategory.POLICIES,
        content: policy,
        title: policy.name,
        description: policy.summary,
        tags: [policy.type],
        keywords: [
          policy.name.toLowerCase(),
          ...policy.keyPoints.map((kp) => kp.toLowerCase()),
          ...this.extractWords(policy.summary),
        ],
        confidence: 1.0,
        lastVerified: now,
        usageCount: 0,
        metadata: {},
      });
    }

    // Dialog Examples
    for (const dialog of this.dialogExamples) {
      items.push({
        id: `dialog-${dialog.exampleId}`,
        type: KnowledgeType.DIALOG_EXAMPLE,
        category: KnowledgeCategory.OTHER,
        content: dialog,
        title: dialog.situation,
        description: dialog.situation,
        tags: dialog.tags,
        keywords: [
          ...dialog.keyPhrases.map((kp) => kp.toLowerCase()),
          ...dialog.tags.map((t) => t.toLowerCase()),
          ...this.extractWords(dialog.situation),
        ],
        confidence: dialog.quality,
        lastVerified: now,
        usageCount: 0,
        metadata: { outcome: dialog.outcome },
      });
    }

    return items;
  }

  private extractBusinessKeywords(info: BusinessInfo): string[] {
    const keywords: string[] = [
      info.name.toLowerCase(),
      info.type.toLowerCase(),
      ...info.amenities.map((a) => a.toLowerCase()),
      ...info.features.map((f) => f.toLowerCase()),
      info.contacts.phone,
      info.contacts.email,
      info.location.city.toLowerCase(),
      info.location.address.toLowerCase(),
    ];
    if (info.tagline) {
      keywords.push(...this.extractWords(info.tagline));
    }
    return keywords;
  }

  private extractWords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);
  }

  // --- Private: Search & Relevance ---

  private calculateRelevance(
    queryWords: string[],
    fullQuery: string,
    item: KnowledgeItem,
  ): { relevance: number; matchedTerms: string[]; snippet: string } {
    const matchedTerms: string[] = [];
    let totalScore = 0;
    let maxPossibleScore = 0;

    // 1. Title match (high weight)
    const titleScore = this.textMatchScore(fullQuery, queryWords, item.title);
    totalScore += titleScore.score * 3;
    maxPossibleScore += 3;
    if (titleScore.matched.length > 0) {
      matchedTerms.push(...titleScore.matched);
    }

    // 2. Description match (medium weight)
    if (item.description) {
      const descScore = this.textMatchScore(fullQuery, queryWords, item.description);
      totalScore += descScore.score * 2;
      maxPossibleScore += 2;
      if (descScore.matched.length > 0) {
        matchedTerms.push(...descScore.matched);
      }
    } else {
      maxPossibleScore += 2;
    }

    // 3. Keywords match (high weight)
    const keywordsText = item.keywords.join(' ');
    const kwScore = this.textMatchScore(fullQuery, queryWords, keywordsText);
    totalScore += kwScore.score * 3;
    maxPossibleScore += 3;
    if (kwScore.matched.length > 0) {
      matchedTerms.push(...kwScore.matched);
    }

    // 4. Tags match (medium weight)
    const tagsText = item.tags.join(' ');
    const tagScore = this.textMatchScore(fullQuery, queryWords, tagsText);
    totalScore += tagScore.score * 2;
    maxPossibleScore += 2;
    if (tagScore.matched.length > 0) {
      matchedTerms.push(...tagScore.matched);
    }

    // 5. Alternative questions match (high weight for FAQ)
    if (item.alternativeQuestions && item.alternativeQuestions.length > 0) {
      let bestAltScore = 0;
      for (const altQ of item.alternativeQuestions) {
        const altScore = this.textMatchScore(fullQuery, queryWords, altQ);
        if (altScore.score > bestAltScore) {
          bestAltScore = altScore.score;
          if (altScore.matched.length > 0) {
            matchedTerms.push(...altScore.matched);
          }
        }
      }
      totalScore += bestAltScore * 3;
    }
    maxPossibleScore += 3;

    // 6. Exact substring bonus
    const normalizedTitle = item.title.toLowerCase();
    if (normalizedTitle.includes(fullQuery)) {
      totalScore += 2;
    }
    maxPossibleScore += 2;

    // Normalize to 0-1
    const relevance = maxPossibleScore > 0
      ? Math.min(1, totalScore / maxPossibleScore)
      : 0;

    // Build snippet
    const snippet = this.buildSnippet(item);

    // Deduplicate matched terms
    const uniqueTerms = [...new Set(matchedTerms)];

    return { relevance, matchedTerms: uniqueTerms, snippet };
  }

  private textMatchScore(
    fullQuery: string,
    queryWords: string[],
    text: string,
  ): { score: number; matched: string[] } {
    const normalizedText = text.toLowerCase();
    const matched: string[] = [];
    let score = 0;

    // Exact full query match
    if (normalizedText.includes(fullQuery)) {
      score += 1.0;
      matched.push(fullQuery);
      return { score, matched };
    }

    // Word-by-word matching
    let matchedCount = 0;
    for (const word of queryWords) {
      if (normalizedText.includes(word)) {
        matchedCount++;
        matched.push(word);
      } else {
        // Partial/fuzzy: check if any text word starts with the query word
        // or the query word starts with a text word (prefix matching)
        const textWords = normalizedText.split(/\s+/);
        for (const tw of textWords) {
          if (tw.startsWith(word) || word.startsWith(tw)) {
            if (tw.length > 2 && word.length > 2) {
              matchedCount += 0.5;
              matched.push(word);
              break;
            }
          }
        }
      }
    }

    if (queryWords.length > 0) {
      score = matchedCount / queryWords.length;
    }

    return { score, matched };
  }

  private buildSnippet(item: KnowledgeItem): string {
    switch (item.type) {
      case KnowledgeType.FAQ: {
        const faq = item.content as FAQItem;
        return faq.answer.length > 150
          ? faq.answer.substring(0, 150) + '...'
          : faq.answer;
      }
      case KnowledgeType.SERVICE: {
        const svc = item.content as ServiceInfo;
        return svc.description.length > 150
          ? svc.description.substring(0, 150) + '...'
          : svc.description;
      }
      case KnowledgeType.POLICY: {
        const pol = item.content as Policy;
        return pol.summary.length > 150
          ? pol.summary.substring(0, 150) + '...'
          : pol.summary;
      }
      case KnowledgeType.BUSINESS_INFO: {
        const biz = item.content as BusinessInfo;
        return biz.description.length > 150
          ? biz.description.substring(0, 150) + '...'
          : biz.description;
      }
      case KnowledgeType.DIALOG_EXAMPLE: {
        const dlg = item.content as DialogExample;
        return dlg.situation;
      }
      default:
        return item.description ?? item.title;
    }
  }
}
