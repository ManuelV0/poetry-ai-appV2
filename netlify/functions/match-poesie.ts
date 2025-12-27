
import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

/**
 * Client Supabase con SERVICE ROLE
 * (solo backend, mai frontend)
 */
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false }
  }
);

export const handler: Handler = async (event) => {
  try {
    // ✅ Solo POST
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }

    // ✅ Parse body
    const body = event.body ? JSON.parse(event.body) : {};
    const { poesia_id } = body;

    if (!poesia_id) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'poesia_id mancante' })
      };
    }

    // 1️⃣ Recupero embedding vettoriale dalla poesia
    const { data: poesia, error: poesiaErr } = await supabase
      .from('poesie')
      .select('poetic_embedding_vec')
      .eq('id', poesia_id)
      .single();

    if (poesiaErr || !poesia?.poetic_embedding_vec) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Embedding non trovato per la poesia richiesta' })
      };
    }

    // 2️⃣ Chiamata RPC (⚠️ solo parametri previsti dalla funzione SQL)
    const { data: matches, error: matchErr } = await supabase.rpc(
      'match_poesie',
      {
        query_embedding: poesia.poetic_embedding_vec,
        match_count: 5
      }
    );

    if (matchErr) {
      console.error('RPC match_poesie error:', matchErr);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Errore durante il match delle poesie' })
      };
    }

    // 3️⃣ Pulizia + rimozione poesia originale
    const cleaned = Array.isArray(matches)
      ? matches
          .filter((m: any) => m.id !== poesia_id)
          .map((m: any) => ({
            id: m.id,
            title: m.title ?? m.titolo ?? 'Senza titolo',
            author_name: m.author_name ?? null,
            similarity: typeof m.similarity === 'number' ? m.similarity : null
          }))
      : [];

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matches: cleaned })
    };

  } catch (err: any) {
    console.error('match-poesie fatal error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: err?.message || 'Errore interno'
      })
    };
  }
};