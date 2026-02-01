import fs from 'fs';
import path from 'path';
import { Logger } from '../utils/logger';

const log = new Logger({ component: 'ResourceManager' });

export interface Resource {
  id: string;
  type: 'file' | 'link' | 'template';
  path?: string;
  url?: string;
  content?: string;
  description: string;
  triggers: string[];
  mimeType?: string;
}

export interface ResourceMatch {
  resource: Resource;
  trigger: string;
  score: number;
}

export interface ResourcesConfig {
  basePath: string;
  resources: ResourceConfigEntry[];
  links?: Record<string, string>;
}

export interface ResourceConfigEntry {
  id: string;
  type: 'file' | 'link' | 'template';
  path?: string;
  url?: string;
  content?: string;
  description: string;
  triggers: string[];
  mimeType?: string;
}

export class ResourceManager {
  private resources: Map<string, Resource> = new Map();
  private basePath: string;
  private links: Record<string, string> = {};

  constructor(config: ResourcesConfig) {
    this.basePath = config.basePath;
    this.links = config.links || {};

    for (const entry of config.resources) {
      const resource: Resource = {
        id: entry.id,
        type: entry.type,
        description: entry.description,
        triggers: entry.triggers.map((t) => t.toLowerCase()),
        mimeType: entry.mimeType,
      };

      if (entry.type === 'file' && entry.path) {
        resource.path = path.resolve(this.basePath, entry.path);
      }
      if (entry.type === 'link' && entry.url) {
        resource.url = entry.url;
      }
      if (entry.type === 'template' && entry.content) {
        resource.content = entry.content;
      }

      this.resources.set(resource.id, resource);
    }

    log.info('Loaded resources', { count: this.resources.size });
  }

  /**
   * Find the best matching resource for a given user message text.
   * Returns null if no trigger matches.
   */
  findMatchingResource(text: string): ResourceMatch | null {
    const lower = text.toLowerCase();
    let bestMatch: ResourceMatch | null = null;

    for (const resource of this.resources.values()) {
      for (const trigger of resource.triggers) {
        if (lower.includes(trigger)) {
          // Score: longer trigger = more specific = better match
          const score = trigger.length / lower.length;
          if (!bestMatch || score > bestMatch.score) {
            bestMatch = { resource, trigger, score };
          }
        }
      }
    }

    return bestMatch;
  }

  /**
   * Get a resource by its ID.
   */
  getResource(id: string): Resource | undefined {
    return this.resources.get(id);
  }

  /**
   * Get a configured link by name.
   */
  getLink(name: string): string | undefined {
    return this.links[name];
  }

  /**
   * Render a template resource with given variables.
   */
  renderTemplate(resourceId: string, vars: Record<string, string>): string | null {
    const resource = this.resources.get(resourceId);
    if (!resource || resource.type !== 'template' || !resource.content) {
      return null;
    }

    let result = resource.content;
    for (const [key, value] of Object.entries(vars)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return result;
  }

  /**
   * Check if a file resource exists on disk.
   */
  isFileAvailable(resourceId: string): boolean {
    const resource = this.resources.get(resourceId);
    if (!resource || resource.type !== 'file' || !resource.path) return false;
    return fs.existsSync(resource.path);
  }

  /**
   * Get the absolute file path for a file resource.
   */
  getFilePath(resourceId: string): string | null {
    const resource = this.resources.get(resourceId);
    if (!resource || resource.type !== 'file' || !resource.path) return null;
    return resource.path;
  }

  /**
   * List all resource IDs.
   */
  listResources(): Resource[] {
    return Array.from(this.resources.values());
  }
}
