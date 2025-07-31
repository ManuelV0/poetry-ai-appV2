-- Estensioni necessarie
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabella profili
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  credits INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabella poesie
CREATE TABLE IF NOT EXISTS poems (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  analysis JSONB,
  embedding vector(1536),
  is_analyzed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_poems_user ON poems(user_id);
CREATE INDEX IF NOT EXISTS idx_poems_embedding ON poems USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

-- Funzione matchmaking
CREATE OR REPLACE FUNCTION find_similar_poems(
  target_id UUID,
  similarity_threshold FLOAT DEFAULT 0.7,
  limit_results INT DEFAULT 5
) RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  similarity FLOAT,
  username TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.content,
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
