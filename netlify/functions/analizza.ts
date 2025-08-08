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
Agisci come un "Futurista Strategico" e un analista di sistemi complessi.
Il tuo compito non è predire il futuro, ma mappare le sue possibilità per fornire un vantaggio decisionale.

Argomento: ${body.content}

Proiettalo 20 anni nel futuro e crea un dossier strategico completo in formato JSON con la seguente struttura obbligatoria:

{
  "vettori_di_cambiamento_attuali": [
    "Descrizione del vettore 1",
    "Descrizione del vettore 2",
    "Descrizione del vettore 3"
  ],
  "scenario_ottimistico": "Descrizione dettagliata dell'utopia plausibile",
  "scenario_pessimistico": "Descrizione dettagliata della distopia plausibile",
  "fattori_inattesi": {
    "positivo_jolly": "Evento positivo imprevisto",
    "negativo_cigno_nero": "Evento negativo imprevisto"
  },
  "dossier_strategico_oggi": {
    "azioni_preparatorie_immediate": [
      "Azione 1",
      "Azione 2",
      "Azione 3"
    ],
    "opportunita_emergenti": [
      "Opportunità 1",
      "Opportunità 2"
    ],
    "rischio_esistenziale_da_mitigare": "Descrizione del rischio"
  }
}

Requisiti:
- Pensa in modo sistemico: le conclusioni devono derivare dall'interconnessione dei punti.
- Tono lucido, strategico e privo di sensazionalismo.
- Usa esempi concreti per illustrare i tuoi punti.
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    });

    console.log("RISPOSTA OPENAI:", completion.choices[0].message.content);

    try {
      analisiGPT = JSON.parse(completion.choices[0].message.content || '{}');
    } catch (jsonErr) {
      console.log("Errore PARSING risposta OpenAI! Risposta grezza:", completion.choices[0].message.content);
      analisiGPT = generateMockAnalysis(body.content);
    }

  } catch (error) {
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
    analisi_letteraria: analisiGPT.vettori_di_cambiamento_attuali || generateMockAnalysis(body.content).vettori_di_cambiamento_attuali,
    analisi_psicologica: analisiGPT || generateMockAnalysis(body.content),
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

// --- Mock fallback aggiornato
function generateMockAnalysis(content) {
  return {
    vettori_di_cambiamento_attuali: [
      "Avanzamenti tecnologici generici",
      "Cambiamenti sociali globali",
      "Tendenze economiche emergenti"
    ],
    scenario_ottimistico: "Uno scenario futuro positivo basato su cooperazione globale e uso etico delle tecnologie.",
    scenario_pessimistico: "Uno scenario negativo caratterizzato da crisi geopolitiche e uso dannoso delle tecnologie.",
    fattori_inattesi: {
      positivo_jolly: "Scoperta scientifica rivoluzionaria che risolve una crisi globale.",
      negativo_cigno_nero: "Evento catastrofico imprevisto che sconvolge le economie mondiali."
    },
    dossier_strategico_oggi: {
      azioni_preparatorie_immediate: [
        "Investire in formazione continua",
        "Diversificare le fonti di reddito",
        "Creare reti di collaborazione"
      ],
      opportunita_emergenti: [
        "Sviluppo di tecnologie sostenibili",
        "Mercati di nicchia legati all'adattamento climatico"
      ],
      rischio_esistenziale_da_mitigare: "Collasso ecologico globale"
    }
  };
}

export { handler };
