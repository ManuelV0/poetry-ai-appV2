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

// --- ALLOWED ORIGINS ---
const ALLOWED_ORIGINS = [
  "https://www.theitalianpoetryproject.com",
  "https://theitalianpoetryproject.com",
  // Aggiungi altri domini qui se serve
];

exports.handler = async function(event, context) {
  const origin = event.headers.origin;
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  // Rispondi subito alle richieste preflight (OPTIONS)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": allowOrigin,
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Max-Age": "86400",
      },
      body: "",
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        "Access-Control-Allow-Origin": allowOrigin,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: 'Solo POST ammesso' }),
    };
  }

  // ... (resto della tua function identico a prima, solo aggiungi gli headers CORS ai return!)
  let text, poesia_id;
  try {
    ({ text, poesia_id } = JSON.parse(event.body || '{}'));
  } catch (err) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": allowOrigin,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: 'Body non valido' }),
    };
  }

  if (!text || !poesia_id) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": allowOrigin,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: 'Testo o ID poesia mancante' }),
    };
  }

  try {
    // --- RICHIESTA A ELEVENLABS ---
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
        headers: {
          "Access-Control-Allow-Origin": allowOrigin,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ error: 'Errore dal servizio vocale', details: errorText }),
      };
    }

    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());
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
        headers: {
          "Access-Control-Allow-Origin": allowOrigin,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ error: 'Upload audio fallito', details: uploadError.message }),
      };
    }

    const { data: { publicUrl }, error: urlError } = supabase
      .storage
      .from('poetry-audio')
      .getPublicUrl(fileName);

    if (urlError || !publicUrl) {
      return {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": allowOrigin,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ error: 'URL pubblico non trovato', details: urlError?.message }),
      };
    }

    await supabase
      .from('poesie')
      .update({ audio_url: publicUrl, audio_generated: true })
      .eq('id', poesia_id);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": allowOrigin,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ audio_url: publicUrl }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": allowOrigin,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: 'Errore interno del server', details: error.message }),
    };
  }
};
