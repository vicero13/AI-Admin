-- AI-Admin PostgreSQL Schema
-- Conversations, Messages, Clients, Handoffs, Logs

CREATE TABLE IF NOT EXISTS conversations (
  conversation_id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  platform VARCHAR(50) NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  last_message_at BIGINT NOT NULL,
  closed_at BIGINT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  mode VARCHAR(50) NOT NULL DEFAULT 'ai',
  context JSONB NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_platform ON conversations (platform);
CREATE INDEX IF NOT EXISTS idx_conversations_active ON conversations (active);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON conversations (last_message_at);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  message_id VARCHAR(255) NOT NULL,
  timestamp BIGINT NOT NULL,
  role VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  intent VARCHAR(255),
  emotion VARCHAR(255),
  confidence REAL,
  handled_by VARCHAR(50) NOT NULL,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages (timestamp);

CREATE TABLE IF NOT EXISTS clients (
  user_id VARCHAR(255) PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  name VARCHAR(255),
  phone_number VARCHAR(50),
  email VARCHAR(255),
  first_contact BIGINT NOT NULL,
  last_contact BIGINT NOT NULL,
  total_conversations INT NOT NULL DEFAULT 0,
  total_messages INT NOT NULL DEFAULT 0,
  type VARCHAR(50) NOT NULL DEFAULT 'new',
  preferred_language VARCHAR(10),
  communication_style VARCHAR(50),
  tags TEXT[] NOT NULL DEFAULT '{}',
  previous_topics TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT[],
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_clients_platform ON clients (platform);
CREATE INDEX IF NOT EXISTS idx_clients_type ON clients (type);
CREATE INDEX IF NOT EXISTS idx_clients_tags ON clients USING GIN (tags);

CREATE TABLE IF NOT EXISTS handoffs (
  handoff_id UUID PRIMARY KEY,
  conversation_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  reason JSONB NOT NULL,
  context JSONB NOT NULL,
  initiated_at BIGINT NOT NULL,
  notified_at BIGINT,
  accepted_at BIGINT,
  resolved_at BIGINT,
  assigned_to VARCHAR(255),
  accepted_by VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  priority VARCHAR(50) NOT NULL DEFAULT 'normal',
  resolution JSONB,
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_handoffs_conversation_id ON handoffs (conversation_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_user_id ON handoffs (user_id);
CREATE INDEX IF NOT EXISTS idx_handoffs_status ON handoffs (status);
CREATE INDEX IF NOT EXISTS idx_handoffs_priority ON handoffs (priority);
CREATE INDEX IF NOT EXISTS idx_handoffs_initiated_at ON handoffs (initiated_at);
CREATE INDEX IF NOT EXISTS idx_handoffs_assigned_to ON handoffs (assigned_to);
CREATE INDEX IF NOT EXISTS idx_handoffs_accepted_by ON handoffs (accepted_by);

CREATE TABLE IF NOT EXISTS logs (
  log_id VARCHAR(255) PRIMARY KEY,
  timestamp BIGINT NOT NULL,
  level VARCHAR(50) NOT NULL,
  component VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  details TEXT,
  conversation_id VARCHAR(255),
  user_id VARCHAR(255),
  handoff_id VARCHAR(255),
  stack_trace TEXT,
  error_code VARCHAR(255),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs (timestamp);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs (level);
CREATE INDEX IF NOT EXISTS idx_logs_component ON logs (component);
CREATE INDEX IF NOT EXISTS idx_logs_conversation_id ON logs (conversation_id);
