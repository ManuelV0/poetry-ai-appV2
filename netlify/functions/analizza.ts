import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// === Utility per variabili d'ambiente ===
const getEnvVar = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Variabile d'ambiente mancante: ${name}`);
  return value;
};

// === Configurazione ===
const supabaseUrl = getEnvVar('SUPABASE_URL');
const supabaseKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY'); // Server-side sicuro
const openaiKey = getEnvVar('OPENAI_API_KEY');

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: 'public' }
});

const openai = new OpenAI({ apiKey: openaiKey });

// === Funzione principale ===
export const handler = async (event) => {
  console.log("=== Ricevuta chiamata PoetryAI ===");

  // Solo POST
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Solo POST consentito' });
  }

  // Auth: JWT obbligatorio
  const authHeader = event.headers['authorization'] || event.headers['Authorization'];
  const token = authHeader?.split(' ')[1];
  if (!token) {
    return jsonResponse(401, { error: 'Token JWT mancante' });
  }

  // Verifica utente
  let user;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) throw error || new Error('Utente non trovato');
    user = data.user;
  } catch (err) {
    return jsonResponse(403, { error: 'Accesso non autorizzato', details: err.message });
  }

  // Parsing body
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return jsonResponse(400, { error: 'Formato JSON non valido' });
  }

  if (!body.content || typeof body.content !== 'string') {
    return jsonResponse(400, { error: 'Il campo "content" è obbligatorio' });
  }

  // Genera analisi GPT
  let analisiGPT;
  const mock = generateMockAnalysis(body.content);

  try {
    const prompt = buildPrompt(body.content);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7
    });

    analisiGPT = JSON.parse(completion.choices[0].message.content || '{}');
  } catch (err) {
    console.error("Errore OpenAI, uso fallback:", err);
    analisiGPT = mock;
  }

  // Prepara dati per DB
  const poemData = {
    title: body.title || null,
    content: body.content,
    author_name: body.author_name || user.user_metadata?.full_name || null,
    profile_id: user.id,
    instagram_handle: body.instagram_handle || null,
    analisi_letteraria: null, // Campo non usato
    analisi_psicologica: analisiGPT,
    match_id: body.match_id || null,
    created_at: new Date().toISOString()
  };

  // Salva in Supabase
  try {
    const { data, error } = await supabase
      .from('poesie')
      .insert(poemData)
      .select('*');

    if (error) throw error;

    console.log("✅ Poesia salvata:", data[0]);
    return jsonResponse(201, data[0]);
  } catch (err) {
    console.error("❌ Errore DB:", err);
    return jsonResponse(500, { error: 'Errore interno del server', details: err.message });
  }
};

// === Utils ===
function jsonResponse(status, body) {
  return {
    statusCode: status,
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  };
}

function buildPrompt(content) {
  return `
Agisci come un "Futurista Strategico" e un analista di sistemi complessi.
Il tuo compito non è predire il futuro, ma mappare le sue possibilità per fornire un vantaggio decisionale.

Argomento: ${content}

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
}

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
