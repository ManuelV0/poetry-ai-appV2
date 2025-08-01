import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// 1. Configurazione con validazione avanzata
const getEnvVar = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    console.error(`❌ Variabile d'ambiente mancante: ${name}`);
    throw new Error(`Configurazione richiesta: ${name}`);
  }
  return value;
};

const supabaseUrl = getEnvVar('SUPABASE_URL');
const supabaseKey = getEnvVar('SUPABASE_ANON_KEY');

// 2. Client Supabase con timeout e retry
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  db: {
    schema: 'public'
  },
  global: {
    fetch: async (input, init) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      try {
        const response = await fetch(input, {
          ...init,
          signal: controller.signal
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response;
      } finally {
        clearTimeout(timeout);
      }
    }
  }
});

const handler: Handler = async (event) => {
  // Debug iniziale
  console.log('Avvio handler con event:', {
    method: event.httpMethod,
    path: event.path,
    query: event.queryStringParameters
  });

  // 1. Validazione metodo HTTP
  if (event.httpMethod !== 'POST') {
    console.warn(`Metodo ${event.httpMethod} non consentito`);
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Solo POST consentito' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  // 2. Verifica autenticazione
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  const token = authHeader?.split(' ')[1];
  
  if (!token) {
    console.warn('Richiesta senza token di autorizzazione');
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Token JWT mancante' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  // 3. Verifica token
  let user;
  try {
    console.log('Verifica token JWT...');
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      console.error('Errore verifica token:', error);
      throw error || new Error('Utente non trovato');
    }
    user = data.user;
    console.log(`Utente verificato: ${user.email} (${user.id})`);
  } catch (error) {
    console.error('Fallita verifica token:', error);
    return {
      statusCode: 403,
      body: JSON.stringify({ 
        error: 'Accesso non autorizzato',
        details: error.message 
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  // 4. Parsing corpo
  let body: any;
  try {
    body = JSON.parse(event.body || '{}');
    console.log('Body ricevuto:', body);
  } catch (e) {
    console.error('Errore parsing JSON:', e);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Formato JSON non valido' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  // 5. Validazione input
  if (!body.content || typeof body.content !== 'string') {
    console.warn('Content mancante o non valido');
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Il campo "content" è obbligatorio' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  // 6. Preparazione dati
  const poemData = {
    title: body.title || null,
    content: body.content,
    author_name: body.author_name || user.user_metadata?.full_name || null,
    profile_id: user.id,
    instagram_handle: body.instagram_handle || null,
    analisi_letteraria: body.analisi_letteraria || generateMockAnalysis(body.content).letteraria,
    analisi_psicologica: body.analisi_psicologica || generateMockAnalysis(body.content).psicologica,
    match_id: body.match_id || null,
    created_at: new Date().toISOString()
  };

  console.log('Dati preparati per inserimento:', poemData);

  // 7. Inserimento nel database
  try {
    console.log('Avvio inserimento in Supabase...');
    const { data, error } = await supabase
      .from('poesie')
      .insert(poemData)
      .select('*');

    if (error) {
      console.error('Errore Supabase:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log('Inserimento riuscito:', data[0]);
    return {
      statusCode: 201,
      body: JSON.stringify(data[0]),
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    };
  } catch (error) {
    console.error('Errore durante l\'inserimento:', {
      message: error.message,
      stack: error.stack
    });
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

// Tipizzazione e mock
interface PoetryAnalysis {
  letteraria: {
    temi: string[];
    tono: string;
    stile: string;
    metafore?: string[];
  };
  psicologica: {
    emozioni: string[];
    tratti: string[];
    valutazione?: number;
  };
}

function generateMockAnalysis(content: string): PoetryAnalysis {
  const lengthType = content.length > 100 ? 'lunga' : 'breve';
  const complexity = content.split(' ').length > 50 ? 'complessa' : 'semplice';

  return {
    letteraria: {
      temi: ['natura', 'amore'],
      tono: lengthType === 'lunga' ? 'profondo' : 'leggero',
      stile: complexity === 'complessa' ? 'ricercato' : 'direct',
      metafore: ['il mare come vita']
    },
    psicologica: {
      emozioni: ['malinconia', 'speranza'],
      tratti: ['introspettivo', 'sensibile'],
      valutazione: 7
    }
  };
}

export { handler };
