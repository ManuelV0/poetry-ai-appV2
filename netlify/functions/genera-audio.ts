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

// --- CORS DOMAINS ---
const ALLOWED_ORIGINS = [
  'https://poetry.theitalianpoetryproject.com',
  'https://widget.theitalianpoetryproject.com',
  'https://www.theitalianpoetryproject.com'
];

// CORS utility
function getCorsHeaders(origin) {
  if (ALLOWED_ORIGINS.includes(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Max-Age': '86400'
    };
  }
  // Fallback (no CORS)
  return {};
}

exports.handler = async function(event, context) {
  const origin = event.headers.origin || event.headers.Origin || '';
  const corsHeaders = getCorsHeaders(origin);

  // CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  // POST only
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Solo POST ammesso' }),
    };
  }

  // Debug su variabili ambiente (log solo su errori)
  if (!SUPABASE_URL) console.error('❌ SUPABASE_URL mancante!');
  if (!SUPABASE_SERVICE_KEY) console.error('❌ SUPABASE_SERVICE_ROLE_KEY mancante!');
  if (!ELEVENLABS_API_KEY) console.error('❌ ELEVENLABS_API_KEY mancante!');

  // Parsing del body JSON
  let text, poesia_id;
  try {
    ({ text, poesia_id } = JSON.parse(event.body || '{}'));
    if (!text || !poesia_id) throw new Error();
  } catch {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Testo o ID poesia mancante' }),
    };
  }

  if (!ELEVENLABS_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Configurazione server incompleta (env missing)' }),
    };
  }

  try {
    // 1. Richiesta TTS a ElevenLabs (stream endpoint)
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
      console.error('❌ Errore ElevenLabs:', errorText);
      return {
        statusCode: ttsResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
      console.error('❌ Errore upload Supabase:', uploadError.message);
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Upload audio fallito', details: uploadError.message }),
      };
    }

    // 3. Ottieni URL pubblico del file caricato
    const { data: { publicUrl }, error: urlError } = supabase
      .storage
      .from('poetry-audio')
      .getPublicUrl(fileName);

    if (urlError || !publicUrl) {
      console.error('❌ Errore publicUrl Supabase:', urlError?.message);
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'URL pubblico non trovato', details: urlError?.message }),
      };
    }

    // 4. Aggiorna la tabella poesie
    const { error: updateError } = await supabase
      .from('poesie')
      .update({ audio_url: publicUrl, audio_generated: true })
      .eq('id', poesia_id);

    if (updateError) {
      console.error('❌ Errore update DB:', updateError.message);
      // Proseguiamo comunque, perché l'audio è stato generato e caricato.
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_url: publicUrl }),
    };

  } catch (error) {
    console.error('❌ Errore generale:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Errore interno del server' }),
    };
  }
};
