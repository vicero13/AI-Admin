import {
  ClientProfile,
  OperationResult,
  Status,
  PlatformType,
  ClientType,
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

export class ClientRepository {
  private clients = new Map<string, ClientProfile>();

  create(client: ClientProfile): OperationResult<ClientProfile> {
    if (this.clients.has(client.userId)) {
      return error('DUPLICATE', `Client ${client.userId} already exists`);
    }
    this.clients.set(client.userId, { ...client });
    return success({ ...client });
  }

  get(userId: string): OperationResult<ClientProfile> {
    const client = this.clients.get(userId);
    if (!client) {
      return error('NOT_FOUND', `Client ${userId} not found`);
    }
    return success({ ...client });
  }

  update(userId: string, updates: Partial<ClientProfile>): OperationResult<ClientProfile> {
    const client = this.clients.get(userId);
    if (!client) {
      return error('NOT_FOUND', `Client ${userId} not found`);
    }
    const updated: ClientProfile = {
      ...client,
      ...updates,
      userId: client.userId,
    };
    this.clients.set(userId, updated);
    return success({ ...updated });
  }

  delete(userId: string): OperationResult<boolean> {
    if (!this.clients.has(userId)) {
      return error('NOT_FOUND', `Client ${userId} not found`);
    }
    this.clients.delete(userId);
    return success(true);
  }

  findByPlatform(platform: PlatformType): OperationResult<ClientProfile[]> {
    const results = Array.from(this.clients.values()).filter(
      (c) => c.platform === platform
    );
    return success(results.map((c) => ({ ...c })));
  }

  findByType(type: ClientType): OperationResult<ClientProfile[]> {
    const results = Array.from(this.clients.values()).filter(
      (c) => c.type === type
    );
    return success(results.map((c) => ({ ...c })));
  }

  findByTags(tags: string[]): OperationResult<ClientProfile[]> {
    const results = Array.from(this.clients.values()).filter((c) =>
      tags.some((tag) => c.tags.includes(tag))
    );
    return success(results.map((c) => ({ ...c })));
  }

  search(query: string): OperationResult<ClientProfile[]> {
    const q = query.toLowerCase();
    const results = Array.from(this.clients.values()).filter((c) => {
      const searchable = [
        c.userId,
        c.name,
        c.email,
        c.phoneNumber,
        ...c.tags,
        ...c.previousTopics,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchable.includes(q);
    });
    return success(results.map((c) => ({ ...c })));
  }

  addTag(userId: string, tag: string): OperationResult<ClientProfile> {
    const client = this.clients.get(userId);
    if (!client) {
      return error('NOT_FOUND', `Client ${userId} not found`);
    }
    if (!client.tags.includes(tag)) {
      client.tags.push(tag);
    }
    return success({ ...client });
  }

  removeTag(userId: string, tag: string): OperationResult<ClientProfile> {
    const client = this.clients.get(userId);
    if (!client) {
      return error('NOT_FOUND', `Client ${userId} not found`);
    }
    client.tags = client.tags.filter((t) => t !== tag);
    return success({ ...client });
  }

  addNote(userId: string, note: string): OperationResult<ClientProfile> {
    const client = this.clients.get(userId);
    if (!client) {
      return error('NOT_FOUND', `Client ${userId} not found`);
    }
    if (!client.notes) {
      client.notes = [];
    }
    client.notes.push(note);
    return success({ ...client });
  }

  updateLastActivity(userId: string): OperationResult<ClientProfile> {
    const client = this.clients.get(userId);
    if (!client) {
      return error('NOT_FOUND', `Client ${userId} not found`);
    }
    client.lastContact = Date.now();
    return success({ ...client });
  }
}
