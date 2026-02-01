export interface AppConfig {
  server: {
    port: number;
    host: string;
  };
  ai: {
    provider: string;
    model: string;
    temperature: number;
    maxTokens: number;
    cacheEnabled: boolean;
    cacheTTL: number;
  };
  personality: {
    name: string;
    role: string;
    style: string;
    traits: Record<string, unknown>;
    patterns: Record<string, string[]>;
    restrictions: {
      avoidWords: string[];
      avoidTopics: string[];
      maxMessageLength: number;
      avoidStyles: string[];
    };
  };
  situationDetection: {
    aiProbing: { minConfidence: number; handoffThreshold: number };
    complexity: { maxScore: number; handoffThreshold: number };
    emotional: { escalationThreshold: number; handoffStates: string[] };
    confidence: { minScore: number; handoffThreshold: number };
  };
  handoff: {
    autoHandoffTriggers: string[];
    notificationChannels: string[];
    stallingMessages: string[];
    customStallingMessages: Record<string, string[]>;
    estimatedWaitTime: number;
    maxWaitBeforeEscalation: number;
  };
  telegram: {
    webhook: {
      url?: string;
      path: string;
      secret?: string;
    };
  };
  knowledgeBasePath: string;
  redis: {
    enabled: boolean;
    host: string;
    port: number;
    db: number;
    keyPrefix: string;
  };
  database: {
    type: string;
    postgres: {
      host: string;
      port: number;
      database: string;
      user: string;
      password: string;
      maxConnections: number;
    };
  };
  logging: {
    level: string;
  };
}

export interface DialogMessage {
  role: 'client' | 'manager';
  text: string;
  intent?: string;
  emotion?: string;
  note?: string;
}

export interface DialogExample {
  exampleId: string;
  situation: string;
  clientType: string;
  messages: DialogMessage[];
  outcome: string;
  quality: number;
  learnings: string[];
  keyPhrases: string[];
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface KBFile {
  name: string;
  path: string;
  type: string;
}
