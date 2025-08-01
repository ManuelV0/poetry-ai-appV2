import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Configurazione robusta con controlli iniziali
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error('Variabili d\'ambiente Supabase mancanti!');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

const handler: Handler = async (event) => {
  // 1. Validazione metodo HTTP
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Metodo non consentito' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  // 2. Verifica autenticazione
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  const token = authHeader?.split(' ')[1];
  
  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Token mancante' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  // 3. Verifica token e ottieni utente
  let user;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) throw error;
    user = data.user;
  } catch (error) {
    console.error('Errore verifica token:', error);
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Token non valido' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  // 4. Parsing e validazione corpo
  let body: any;
  try {
    body = JSON.parse(event.body || '{}');
    if (!body.content || typeof body.content !== 'string') {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Campo "content" obbligatorio' }),
        headers: { 'Content-Type': 'application/json' }
      };
    }
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'JSON malformato' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  // 5. Preparazione dati con tipi esatti
  const poemData = {
    title: body.title || null,
    content: body.content,
    author_name: body.author_name || null,
    profile_id: user.id,
    instagram_handle: body.instagram_handle || null,
    analisi_letteraria: body.analisi_letteraria || generateMockAnalysis(body.content).letteraria,
    analisi_psicologica: body.analisi_psicologica || generateMockAnalysis(body.content).psicologica,
    match_id: body.match_id || null,
    created_at: new Date().toISOString()
  };

  console.log('Dati preparati per l\'inserimento:', poemData);

  // 6. Inserimento con gestione errori dettagliata
  try {
    const { data, error } = await supabase
      .from('poesie')
      .insert(poemData)
      .select('*');

    if (error) {
      console.error('Errore Supabase dettagliato:', {
        message: error.message,
        code: error.code,
        details: error.details
      });
      throw error;
    }

    return {
      statusCode: 201,
      body: JSON.stringify(data[0]),
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    };
  } catch (error) {
    console.error('Errore completo:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Errore interno del server',
        request_id: event.headers['x-request-id'] || null
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};

// Helper con tipizzazione completa
interface MockAnalysis {
  letteraria: {
    temi: string[];
    tono: string;
    stile: string;
  };
  psicologica: {
    emozioni: string[];
    tratti: string[];
  };
}

function generateMockAnalysis(content: string): MockAnalysis {
  return {
    letteraria: {
      temi: ['tema1', 'tema2'],
      tono: content.length > 100 ? 'complesso' : 'semplice',
      stile: 'moderno'
    },
    psicologica: {
      emozioni: ['emozione1'],
      tratti: ['introspettivo']
    }
  };
}

export { handler };
