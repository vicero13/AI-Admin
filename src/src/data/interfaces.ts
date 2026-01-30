import {
  OperationResult,
  Conversation,
  ContextMessage,
  ClientProfile,
  Handoff,
  HandoffStats,
  HandoffResolution,
  LogEntry,
  DateRange,
  PlatformType,
  ClientType,
  HandoffStatus,
  HandoffPriority,
  UUID,
} from '../types';
import { LogQueryFilters } from './repositories/logs';

export interface IConversationRepository {
  create(conversation: Conversation): Promise<OperationResult<Conversation>>;
  get(conversationId: UUID): Promise<OperationResult<Conversation>>;
  update(conversationId: UUID, updates: Partial<Conversation>): Promise<OperationResult<Conversation>>;
  delete(conversationId: UUID): Promise<OperationResult<boolean>>;
  findByUserId(userId: string): Promise<OperationResult<Conversation[]>>;
  findActive(): Promise<OperationResult<Conversation[]>>;
  findByPlatform(platform: PlatformType): Promise<OperationResult<Conversation[]>>;
  addMessage(conversationId: UUID, message: ContextMessage): Promise<OperationResult<ContextMessage>>;
  getMessages(conversationId: UUID): Promise<OperationResult<ContextMessage[]>>;
  clearMessages(conversationId: UUID): Promise<OperationResult<boolean>>;
  close(conversationId: UUID): Promise<OperationResult<Conversation>>;
  closeInactive(maxIdleMs: number): Promise<OperationResult<number>>;
}

export interface IClientRepository {
  create(client: ClientProfile): Promise<OperationResult<ClientProfile>>;
  get(userId: string): Promise<OperationResult<ClientProfile>>;
  update(userId: string, updates: Partial<ClientProfile>): Promise<OperationResult<ClientProfile>>;
  delete(userId: string): Promise<OperationResult<boolean>>;
  findByPlatform(platform: PlatformType): Promise<OperationResult<ClientProfile[]>>;
  findByType(type: ClientType): Promise<OperationResult<ClientProfile[]>>;
  findByTags(tags: string[]): Promise<OperationResult<ClientProfile[]>>;
  search(query: string): Promise<OperationResult<ClientProfile[]>>;
  addTag(userId: string, tag: string): Promise<OperationResult<ClientProfile>>;
  removeTag(userId: string, tag: string): Promise<OperationResult<ClientProfile>>;
  addNote(userId: string, note: string): Promise<OperationResult<ClientProfile>>;
  updateLastActivity(userId: string): Promise<OperationResult<ClientProfile>>;
}

export interface IHandoffRepository {
  create(handoff: Handoff): Promise<OperationResult<Handoff>>;
  get(handoffId: UUID): Promise<OperationResult<Handoff>>;
  update(handoffId: UUID, updates: Partial<Handoff>): Promise<OperationResult<Handoff>>;
  delete(handoffId: UUID): Promise<OperationResult<boolean>>;
  findByConversation(conversationId: string): Promise<OperationResult<Handoff[]>>;
  findByManager(managerId: string): Promise<OperationResult<Handoff[]>>;
  findByStatus(status: HandoffStatus): Promise<OperationResult<Handoff[]>>;
  findByPriority(priority: HandoffPriority): Promise<OperationResult<Handoff[]>>;
  getPending(): Promise<OperationResult<Handoff[]>>;
  assign(handoffId: UUID, managerId: string): Promise<OperationResult<Handoff>>;
  accept(handoffId: UUID, managerId: string): Promise<OperationResult<Handoff>>;
  resolve(handoffId: UUID, resolution: HandoffResolution): Promise<OperationResult<Handoff>>;
  getStats(range: DateRange): Promise<OperationResult<HandoffStats>>;
}

export interface ILogRepository {
  log(entry: Omit<LogEntry, 'logId' | 'timestamp'>): Promise<OperationResult<LogEntry>>;
  logMany(entries: Omit<LogEntry, 'logId' | 'timestamp'>[]): Promise<OperationResult<number>>;
  logHandoff(handoffId: string, conversationId: string, message: string, details?: string): Promise<OperationResult<LogEntry>>;
  logAIProbing(conversationId: string, message: string, details?: string): Promise<OperationResult<LogEntry>>;
  logError(component: string, message: string, errorCode?: string, stackTrace?: string, conversationId?: string): Promise<OperationResult<LogEntry>>;
  query(filters: LogQueryFilters): Promise<OperationResult<LogEntry[]>>;
  deleteOld(beforeTimestamp: number): Promise<OperationResult<number>>;
}
