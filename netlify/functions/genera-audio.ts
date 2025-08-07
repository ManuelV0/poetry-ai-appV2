// netlify/functions/genera-audio.js

const { createClient } = require('@supabase/supabase-js');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// --- CONFIGURAZIONE SUPABASE (SERVICE KEY necessaria!) ---
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = 'uScy1bXtKz8vPzfdFsFw'; // Voce italiana maschile ElevenLabs

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY
);

// --- CORS UNIVERSALE ROBUSTO ---
const ALLOWED_ORIGINS = [
  "https://www.theitalianpoetryproject.com",
  "https://theitalianpoetryproject.com",
  "https://poetry.theitalianpoetryproject.com",
  "https://widget.theitalianpoetryproject.com",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173"
];

exports.handler = async function(event, context) {
  const origin = event.headers.origin || "";
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  const CORS_HEADERS = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    // Qui la riga importante 👇
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
    "Access-Control-Allow-Credentials": "true",
    "Vary": "Origin"
  };

  // --- Preflight CORS ---
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ""
    };
  }

  // --- Solo POST ---
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Solo POST ammesso' }),
    };
  }

  // --- Check ENV ---
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !ELEVENLABS_API_KEY) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Configurazione server incompleta (env missing)' }),
    };
  }

  // --- Parse dati body ---
  let text, poesia_id;
  try {
    ({ text, poesia_id } = JSON.parse(event.body || '{}'));
  } catch (err) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Body non valido' }),
    };
  }

  if (!text || !poesia_id) {
    return {
      statusCode: 400,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Testo o ID poesia mancante' }),
    };
  }

  try {
    // 1. Richiesta TTS a ElevenLabs
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      }
    );

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      return {
        statusCode: ttsResponse.status,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Errore dal servizio vocale', details: errorText }),
      };
    }

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());

    // 2. Carica su Supabase Storage
    const fileName = `poesia-${poesia_id}-${Date.now()}.mp3`;

    const { error: uploadError } = await supabase
      .storage
      .from('poetry-audio')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true
      });

    if (uploadError) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Upload audio fallito', details: uploadError.message }),
      };
    }

    // 3. Ottieni URL pubblico
    const { data: { publicUrl }, error: urlError } = supabase
      .storage
      .from('poetry-audio')
      .getPublicUrl(fileName);

    if (urlError || !publicUrl) {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'URL pubblico non trovato', details: urlError?.message }),
      };
    }

    // 4. Aggiorna la tabella poesie
    const { error: updateError } = await supabase
      .from('poesie')
      .update({ audio_url: publicUrl, audio_generated: true })
      .eq('id', poesia_id);

    // Non è bloccante: puoi non fare throw qui

    // Successo finale!
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ audio_url: publicUrl }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Errore interno del server', details: error.message }),
    };
  }
};
