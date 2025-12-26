
import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { poesia_id } = JSON.parse(event.body || '{}');

    if (!poesia_id) {
      return { statusCode: 400, body: 'poesia_id mancante' };
    }

    // 1️⃣ Recupero embedding corretto
    const { data: poesia, error: poesiaErr } = await supabase
      .from('poesie')
      .select('poetic_embedding_vec')
      .eq('id', poesia_id)
      .single();

    if (poesiaErr || !poesia?.poetic_embedding_vec) {
      return {
        statusCode: 404,
        body: 'Embedding non trovato per la poesia'
      };
    }

    // 2️⃣ Chiamata RPC ALLINEATA
    const { data: matches, error: matchErr } = await supabase.rpc(
      'match_poesie',
      {
        poesia_id: poesia_id,
        query_embedding: poesia.poetic_embedding_vec,
        match_count: 5
      }
    );

    if (matchErr) {
      throw matchErr;
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ matches })
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message || 'Errore interno'
      })
    };
  }
};
