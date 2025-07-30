-- Abilita estensioni necessarie
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_crypto;

-- Tabella poesie
CREATE TABLE IF NOT EXISTS public.poems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  analysis JSONB,
  embedding vector(1536),
  is_analyzed BOOLEAN DEFAULT FALSE,
  user_id UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indice per ricerca vettoriale
CREATE INDEX idx_poem_embedding ON poems USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

-- Funzione per trovare poesie simili
CREATE OR REPLACE FUNCTION find_similar_poems(
  target_id UUID,
  similarity_threshold FLOAT DEFAULT 0.7,
  limit_results INT DEFAULT 3
) 
RETURNS TABLE (
  id UUID,
  text TEXT,
  similarity FLOAT
) 
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.text,
    1 - (p.embedding <=> target.embedding) AS similarity
  FROM poems p
  JOIN poems target ON target.id = target_id
  WHERE p.id != target_id
  AND 1 - (p.embedding <=> target.embedding) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql;
