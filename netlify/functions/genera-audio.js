const fetch = require('node-fetch');

// Imposta le tue ENV VAR: ELEVEN_API_KEY e SUPABASE_SECRET/SUPABASE_URL in Netlify
const ELEVENLABS_API_KEY = process.env.ELEVEN_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET;

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { poesia_id } = JSON.parse(event.body);

    // 1. Recupera la poesia dal DB (solo testo!)
    const poesiaRes = await fetch(`${SUPABASE_URL}/rest/v1/poesie?id=eq.${poesia_id}`, {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      }
    });
    const poesiaArr = await poesiaRes.json();
    if (!poesiaArr[0]) return { statusCode: 404, body: 'Poesia non trovata' };
    const poesia = poesiaArr[0];

    // 2. Scegli la voce: puoi cambiare qui la logica (es: poesia.analisi_psicologica.tono_emotivo)
    const voice_id = 'EXAVITQu4vr4xnSDxMaL'; // Es: Rachel (default) - trova ID voce che preferisci
    const text = poesia.content;

    // 3. Richiedi audio a ElevenLabs
    const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.4, similarity_boost: 0.8 }
      })
    });
    if (!elevenRes.ok) {
      const err = await elevenRes.text();
      return { statusCode: 400, body: `Errore ElevenLabs: ${err}` }
    }
    const audioBuffer = await elevenRes.buffer();

    // 4. Salva su Supabase Storage
    const filename = `poesie_audio/${poesia_id}_${Date.now()}.mp3`;
    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/poetry-audio/${filename}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'audio/mpeg'
      },
      body: audioBuffer
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      return { statusCode: 400, body: `Errore upload audio: ${err}` }
    }

    // 5. Ottieni public URL (adatta il bucket path al tuo Supabase)
    const audio_url = `${SUPABASE_URL.replace('/rest/v1','')}/storage/v1/object/public/poetry-audio/${filename}`;

    // 6. Aggiorna la poesia su Supabase
    await fetch(`${SUPABASE_URL}/rest/v1/poesie?id=eq.${poesia_id}`, {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        audio_url,
        audio_generated: true
      })
    });

    // 7. Risposta
    return {
      statusCode: 200,
      body: JSON.stringify({ audio_url })
    }
  } catch (err) {
    return { statusCode: 500, body: `Errore server: ${err.message}` }
  }
}
