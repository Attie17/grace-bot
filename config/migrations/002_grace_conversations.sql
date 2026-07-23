-- Grace Conversations Table
-- Stores full conversation history, extracted fields, and metadata

CREATE TABLE grace_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Conversation metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Conversation content
  messages JSONB NOT NULL DEFAULT '[]'::jsonb, -- Full message history
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned', 'escalated')),
  
  -- Extracted fields (populated after conversation)
  extracted_fields JSONB DEFAULT NULL,
  extraction_confidence FLOAT DEFAULT 0,
  
  -- Risk and sentiment tracking
  sentiment_trajectory TEXT DEFAULT 'unknown',
  escalation_flag BOOLEAN DEFAULT FALSE,
  escalation_reason TEXT DEFAULT NULL,
  
  -- Audit trail
  model_used TEXT DEFAULT 'claude-sonnet-4-6',
  created_by_ip TEXT DEFAULT NULL
);

-- Indexes for querying
CREATE INDEX idx_grace_conversations_status ON grace_conversations(status);
CREATE INDEX idx_grace_conversations_created_at ON grace_conversations(created_at);
CREATE INDEX idx_grace_conversations_escalation ON grace_conversations(escalation_flag);

-- Enable RLS
ALTER TABLE grace_conversations ENABLE ROW LEVEL SECURITY;

-- Policy: Only backend can insert (via service key)
CREATE POLICY "Backend only" ON grace_conversations
  FOR ALL USING (true)
  WITH CHECK (true);
