import {
  KnowledgeItem,
  KnowledgeSearchResult,
  KnowledgeType,
  KnowledgeCategory,
  OperationResult,
  Status,
} from '../../types';

function success<T>(data: T): OperationResult<T> {
  return { status: Status.SUCCESS, data, timestamp: Date.now() };
}

function error<T>(code: string, message: string): OperationResult<T> {
  return {
    status: Status.ERROR,
    error: { code, message },
    timestamp: Date.now(),
  };
}

export interface KnowledgeStats {
  totalItems: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
  averageConfidence: number;
  totalUsage: number;
}

export class KnowledgeRepository {
  private items = new Map<string, KnowledgeItem>();

  search(query: string): OperationResult<KnowledgeSearchResult[]> {
    const q = query.toLowerCase();
    const results: KnowledgeSearchResult[] = [];

    for (const item of this.items.values()) {
      const matchedTerms: string[] = [];
      const searchFields = [
        item.title,
        item.description ?? '',
        ...item.keywords,
        ...item.tags,
        ...(item.alternativeQuestions ?? []),
      ];

      const searchText = searchFields.join(' ').toLowerCase();

      const queryTerms = q.split(/\s+/).filter(Boolean);
      for (const term of queryTerms) {
        if (searchText.includes(term)) {
          matchedTerms.push(term);
        }
      }

      if (matchedTerms.length > 0) {
        const relevance = matchedTerms.length / queryTerms.length;
        results.push({
          item: { ...item },
          relevance,
          matchedTerms,
          snippet: item.description ?? item.title,
        });
      }
    }

    results.sort((a, b) => b.relevance - a.relevance);
    return success(results);
  }

  findById(id: string): OperationResult<KnowledgeItem> {
    const item = this.items.get(id);
    if (!item) {
      return error('NOT_FOUND', `Knowledge item ${id} not found`);
    }
    return success({ ...item });
  }

  findByCategory(category: KnowledgeCategory): OperationResult<KnowledgeItem[]> {
    const results = Array.from(this.items.values()).filter(
      (item) => item.category === category
    );
    return success(results.map((i) => ({ ...i })));
  }

  findByTags(tags: string[]): OperationResult<KnowledgeItem[]> {
    const results = Array.from(this.items.values()).filter((item) =>
      tags.some((tag) => item.tags.includes(tag))
    );
    return success(results.map((i) => ({ ...i })));
  }

  findByType(type: KnowledgeType): OperationResult<KnowledgeItem[]> {
    const results = Array.from(this.items.values()).filter(
      (item) => item.type === type
    );
    return success(results.map((i) => ({ ...i })));
  }

  add(item: KnowledgeItem): OperationResult<KnowledgeItem> {
    if (this.items.has(item.id)) {
      return error('DUPLICATE', `Knowledge item ${item.id} already exists`);
    }
    this.items.set(item.id, { ...item });
    return success({ ...item });
  }

  update(id: string, updates: Partial<KnowledgeItem>): OperationResult<KnowledgeItem> {
    const item = this.items.get(id);
    if (!item) {
      return error('NOT_FOUND', `Knowledge item ${id} not found`);
    }
    const updated: KnowledgeItem = {
      ...item,
      ...updates,
      id: item.id,
    };
    this.items.set(id, updated);
    return success({ ...updated });
  }

  delete(id: string): OperationResult<boolean> {
    if (!this.items.has(id)) {
      return error('NOT_FOUND', `Knowledge item ${id} not found`);
    }
    this.items.delete(id);
    return success(true);
  }

  incrementUsage(id: string): OperationResult<KnowledgeItem> {
    const item = this.items.get(id);
    if (!item) {
      return error('NOT_FOUND', `Knowledge item ${id} not found`);
    }
    item.usageCount++;
    item.lastUsed = Date.now();
    return success({ ...item });
  }

  updateLastUsed(id: string): OperationResult<KnowledgeItem> {
    const item = this.items.get(id);
    if (!item) {
      return error('NOT_FOUND', `Knowledge item ${id} not found`);
    }
    item.lastUsed = Date.now();
    return success({ ...item });
  }

  getStats(): OperationResult<KnowledgeStats> {
    const all = Array.from(this.items.values());
    const byType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let totalConfidence = 0;
    let totalUsage = 0;

    for (const item of all) {
      byType[item.type] = (byType[item.type] ?? 0) + 1;
      byCategory[item.category] = (byCategory[item.category] ?? 0) + 1;
      totalConfidence += item.confidence;
      totalUsage += item.usageCount;
    }

    return success({
      totalItems: all.length,
      byType,
      byCategory,
      averageConfidence: all.length > 0 ? totalConfidence / all.length : 0,
      totalUsage,
    });
  }

  getMostUsed(limit: number = 10): OperationResult<KnowledgeItem[]> {
    const sorted = Array.from(this.items.values())
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, limit);
    return success(sorted.map((i) => ({ ...i })));
  }

  getLeastUsed(limit: number = 10): OperationResult<KnowledgeItem[]> {
    const sorted = Array.from(this.items.values())
      .sort((a, b) => a.usageCount - b.usageCount)
      .slice(0, limit);
    return success(sorted.map((i) => ({ ...i })));
  }
}
