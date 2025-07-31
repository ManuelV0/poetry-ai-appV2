-- Estensioni necessarie
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabella poesie
CREATE TABLE poems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text TEXT NOT NULL,
  analysis JSONB,
  embedding vector(1536),
  is_analyzed BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella profili (estensione auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  credits INTEGER DEFAULT 0
);

-- Indici per performance
CREATE INDEX idx_poems_user ON poems(user_id);
CREATE INDEX idx_poems_embedding ON poems USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
CREATE INDEX idx_poems_created ON poems(created_at);

-- Funzione per matchmaking
CREATE OR REPLACE FUNCTION find_similar_poems(
  target_id UUID,
  similarity_threshold FLOAT DEFAULT 0.7,
  limit_results INT DEFAULT 5
) RETURNS TABLE (
  id UUID,
  text TEXT,
  similarity FLOAT,
  username TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.text,
    1 - (p.embedding <=> (SELECT embedding FROM poems WHERE id = target_id)) AS similarity,
    pr.username
  FROM poems p
  JOIN profiles pr ON p.user_id = pr.id
  WHERE p.id != target_id
  AND p.is_analyzed = TRUE
  AND 1 - (p.embedding <=> (SELECT embedding FROM poems WHERE id = target_id)) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql;