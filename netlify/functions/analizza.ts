
import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai'; // <--- ASSICURATI: openai pacchetto installato

// --- Utility per ENV
const getEnvVar = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Variabile d'ambiente mancante: ${name}`);
  return value;
};

const supabaseUrl = getEnvVar('SUPABASE_URL');
const supabaseKey = getEnvVar('SUPABASE_ANON_KEY');  // Usa Service Role se hai bisogno di poteri elevati!
const openaiKey = getEnvVar('OPENAI_API_KEY');

// --- Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: 'public' }
});

const openai = new OpenAI({ apiKey: openaiKey });

const handler: Handler = async (event) => {
  // --- Solo POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Solo POST consentito' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  // --- Auth: JWT obbligatorio
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  const token = authHeader?.split(' ')[1];
  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Token JWT mancante' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  // --- Verifica token
  let user;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) throw error || new Error('Utente non trovato');
    user = data.user;
  } catch (error: any) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Accesso non autorizzato', details: error.message }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  // --- Parsing body
  let body: any;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Formato JSON non valido' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  if (!body.content || typeof body.content !== 'string') {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Il campo "content" è obbligatorio' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  // --- Analisi GPT
  let analisiGPT: any = {};
  try {
    const prompt = `
Agisci come critico letterario e psicologo. Analizza la poesia seguente nei seguenti due blocchi:

1. Analisi Letteraria:
- Stile
- Temi
- Struttura
- Eventuali riferimenti culturali

2. Analisi Psicologica:
- Emozioni
- Stato interiore del poeta
- Visione del mondo

Rispondi in JSON come segue:

{
  "analisi_letteraria": {
    "stile_letterario": "...",
    "temi": ["...", "..."],
    "struttura": "...",
    "riferimenti_culturali": "..."
  },
  "analisi_psicologica": {
    "emozioni": ["...", "..."],
    "stato_interno": "...",
    "visione_del_mondo": "..."
  }
}

POESIA:
${body.content}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    });
    analisiGPT = JSON.parse(completion.choices[0].message.content || '{}');
  } catch (error) {
    // In caso di errore OpenAI: fallback mock
    analisiGPT = generateMockAnalysis(body.content);
  }

  // --- Prepara dati per Supabase
  const poemData = {
    title: body.title || null,
    content: body.content,
    author_name: body.author_name || user.user_metadata?.full_name || null,
    profile_id: user.id,
    instagram_handle: body.instagram_handle || null,
    analisi_letteraria: analisiGPT.analisi_letteraria || generateMockAnalysis(body.content).letteraria,
    analisi_psicologica: analisiGPT.analisi_psicologica || generateMockAnalysis(body.content).psicologica,
    match_id: body.match_id || null,
    created_at: new Date().toISOString()
  };

  // --- Inserimento in DB
  try {
    const { data, error } = await supabase
      .from('poesie')
      .insert(poemData)
      .select('*');
    if (error) throw error;
    return {
      statusCode: 201,
      body: JSON.stringify(data[0]),
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Errore interno del server',
        details: error.message
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};

// --- Mock fallback
function generateMockAnalysis(content: string) {
  return {
    letteraria: {
      temi: ['natura', 'amore'],
      tono: content.length > 100 ? 'profondo' : 'leggero',
      stile: content.split(' ').length > 50 ? 'ricercato' : 'direct',
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
