import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as YAML from 'yaml';
import { AppConfig, LogLevel } from '../types';

dotenv.config();

export class ConfigManager {
  private config: Record<string, unknown>;
  private loaded: boolean;

  constructor() {
    this.config = {};
    this.loaded = false;
  }

  load(configDir?: string): void {
    const baseDir = configDir ?? path.resolve(process.cwd(), 'config');
    const defaultPath = path.join(baseDir, 'default.yaml');

    if (fs.existsSync(defaultPath)) {
      const fileContent = fs.readFileSync(defaultPath, 'utf-8');
      const yamlConfig = YAML.parse(fileContent);
      if (yamlConfig && typeof yamlConfig === 'object') {
        this.config = this.deepMerge(this.config, yamlConfig);
      }
    }

    const envOverrides = this.parseEnvVariables();
    this.config = this.deepMerge(this.config, envOverrides);

    this.loaded = true;
  }

  get<T = unknown>(keyPath: string, defaultValue?: T): T {
    if (!this.loaded) {
      this.load();
    }

    const keys = keyPath.split('.');
    let current: unknown = this.config;

    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return defaultValue as T;
      }
      current = (current as Record<string, unknown>)[key];
    }

    if (current === undefined) {
      return defaultValue as T;
    }

    return current as T;
  }

  set(keyPath: string, value: unknown): void {
    if (!this.loaded) {
      this.load();
    }

    const keys = keyPath.split('.');
    let current: Record<string, unknown> = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = value;
  }

  has(keyPath: string): boolean {
    if (!this.loaded) {
      this.load();
    }

    const keys = keyPath.split('.');
    let current: unknown = this.config;

    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return false;
      }
      current = (current as Record<string, unknown>)[key];
    }

    return current !== undefined;
  }

  getAll(): Record<string, unknown> {
    if (!this.loaded) {
      this.load();
    }
    return this.deepClone(this.config) as Record<string, unknown>;
  }

  private parseEnvVariables(): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(process.env)) {
      if (!key.startsWith('APP_') || value === undefined) {
        continue;
      }

      const configPath = key
        .substring(4)
        .toLowerCase()
        .replace(/__/g, '.');

      this.setNestedValue(result, configPath, this.parseValue(value));
    }

    return result;
  }

  private setNestedValue(obj: Record<string, unknown>, keyPath: string, value: unknown): void {
    const keys = keyPath.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }

    current[keys[keys.length - 1]] = value;
  }

  private parseValue(value: string): unknown {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null') return null;

    const num = Number(value);
    if (!isNaN(num) && value.trim() !== '') {
      return num;
    }

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (
        value !== null &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        key in result &&
        result[key] !== null &&
        typeof result[key] === 'object' &&
        !Array.isArray(result[key])
      ) {
        result[key] = this.deepMerge(
          result[key] as Record<string, unknown>,
          value as Record<string, unknown>,
        );
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private deepClone(obj: unknown): unknown {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map((item) => this.deepClone(item));
    }
    const cloned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      cloned[key] = this.deepClone(value);
    }
    return cloned;
  }
}

export const config = new ConfigManager();

export default config;
