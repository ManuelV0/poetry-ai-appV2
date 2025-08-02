import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// --- Utility per ENV
const getEnvVar = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Variabile d'ambiente mancante: ${name}`);
  return value;
};

const supabaseUrl = getEnvVar('SUPABASE_URL');
const supabaseKey = getEnvVar('SUPABASE_ANON_KEY');
const openaiKey = getEnvVar('OPENAI_API_KEY');

// --- Supabase client
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: 'public' }
});

const openai = new OpenAI({ apiKey: openaiKey });

const handler = async (event) => {
  console.log("=== Ricevuta chiamata PoetryAI ===");

  // --- Solo POST
  if (event.httpMethod !== 'POST') {
    console.log("Chiamata non POST!");
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
    console.log("Token JWT mancante!");
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
    if (error || !data.user) {
      console.log("Errore auth o user mancante:", error);
      throw error || new Error('Utente non trovato');
    }
    user = data.user;
  } catch (error) {
    console.log("Errore durante auth:", error);
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Accesso non autorizzato', details: error.message }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  // --- Parsing body
  let body;
  try {
    body = JSON.parse(event.body || '{}');
    console.log("BODY ricevuto:", body);
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
  let analisiGPT = {};
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

    // Stampo per debug la risposta di OpenAI
    console.log("RISPOSTA OPENAI:", completion.choices[0].message.content);

    // Se la risposta è una stringa JSON, provo a fare il parse
    try {
      analisiGPT = JSON.parse(completion.choices[0].message.content || '{}');
    } catch (jsonErr) {
      console.log("Errore PARSING risposta OpenAI! Risposta grezza:", completion.choices[0].message.content);
      analisiGPT = generateMockAnalysis(body.content);
    }

  } catch (error) {
    // In caso di errore OpenAI: fallback mock
    console.log("Errore chiamata OpenAI (usa mock):", error);
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
    if (error) {
      console.log("Errore salvataggio DB:", error);
      throw error;
    }
    console.log("Poesia SALVATA nel DB!", data);
    return {
      statusCode: 201,
      body: JSON.stringify(data[0]),
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    };
  } catch (error) {
    console.log("ERRORE FINALE:", error);
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
function generateMockAnalysis(content) {
  return {
    analisi_letteraria: {
      stile_letterario: content.length > 100 ? 'profondo' : 'leggero',
      temi: ['natura', 'amore'],
      struttura: content.split(' ').length > 50 ? 'strofe libere' : 'versi brevi',
      riferimenti_culturali: 'Generici'
    },
    analisi_psicologica: {
      emozioni: ['malinconia', 'speranza'],
      stato_interno: 'Introspettivo',
      visione_del_mondo: 'Ottimista ma riflessivo'
    }
  };
}

export { handler };
