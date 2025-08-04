// netlify/functions/genera-audio.js

const { createClient } = require('@supabase/supabase-js');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// --- CONFIGURAZIONE SUPABASE ---
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Solo POST ammesso' }),
    };
  }

  // Leggi il body come JSON
  const { text, poesia_id } = JSON.parse(event.body || '{}');
  if (!text || text.trim() === '' || !poesia_id) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Testo o ID poesia mancante' }),
    };
  }

  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  const VOICE_ID = 'uScy1bXtKz8vPzfdFsFw'; // Voce italiana maschile ElevenLabs

  // Check per sicurezza
  if (!ELEVENLABS_API_KEY) {
    console.error('❌ API key ElevenLabs mancante');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Chiave API non configurata nel server' }),
    };
  }

  try {
    // 1. Richiesta a ElevenLabs
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Errore dal servizio vocale', details: errorText }),
      };
    }
    const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());

    // 2. Carica audio su Supabase Storage
    const fileName = `poesia-${poesia_id}-${Date.now()}.mp3`;
    const { error: uploadError } = await supabase
      .storage
      .from('poetry-audio')
      .upload(fileName, audioBuffer, { contentType: 'audio/mpeg', upsert: true });
    if (uploadError) {
      console.error('❌ Errore upload Supabase:', uploadError.message);
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Upload audio fallito', details: uploadError.message }),
      };
    }

    // 3. Ottieni URL pubblico del file caricato
    const { publicURL } = supabase
      .storage
      .from('poetry-audio')
      .getPublicUrl(fileName);

    // 4. Aggiorna la tabella poesie
    const { error: updateError } = await supabase
      .from('poesie')
      .update({ audio_url: publicURL })
      .eq('id', poesia_id);
    if (updateError) {
      console.error('❌ Errore update DB:', updateError.message);
      // (opzionale: continua anche se update fallisce)
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_url: publicURL }),
    };

  } catch (error) {
    console.error('❌ Errore generale:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Errore interno del server' }),
    };
  }
};
