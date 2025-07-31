-- Estensioni necessarie
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Tabella poems
CREATE TABLE IF NOT EXISTS poems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text TEXT NOT NULL CHECK (char_length(text) > 10),
  analysis JSONB,
  embedding vector(1536),
  is_analyzed BOOLEAN DEFAULT FALSE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indici
CREATE INDEX idx_poems_user ON poems(user_id);
CREATE INDEX idx_poems_embedding ON poems USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

-- Funzione per updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
CREATE TRIGGER poems_timestamp
BEFORE UPDATE ON poems
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Funzione matchmaking
CREATE OR REPLACE FUNCTION find_similar_poems(
  target_id UUID,
  similarity_threshold FLOAT DEFAULT 0.65,
  limit_results INT DEFAULT 5
) RETURNS TABLE (
  id UUID,
  text TEXT,
  similarity FLOAT,
  author_name TEXT,
  author_avatar TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.text,
    1 - (p.embedding <=> target.embedding) AS similarity,
    prof.username AS author_name,
    prof.avatar_url AS author_avatar
  FROM poems p
  JOIN profiles prof ON p.user_id = prof.id
  CROSS JOIN (SELECT embedding FROM poems WHERE id = target_id) target
  WHERE p.id != target_id
  AND p.is_analyzed = TRUE
  AND 1 - (p.embedding <=> target.embedding) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql;