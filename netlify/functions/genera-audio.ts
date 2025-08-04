// netlify/functions/genera-audio.js

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Solo POST ammesso' }),
    };
  }

  // Leggi il body come JSON
  const { text } = JSON.parse(event.body || '{}');

  if (!text || text.trim() === '') {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Testo mancante' }),
    };
  }

  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  const VOICE_ID = 'lwGnQIn0Z9pl1SoUiXZ3'; // Nuova voce italiana ElevenLabs

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
    console.log('🎙️ Invio richiesta a ElevenLabs...');

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
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75
          }
        })
      }
    );

    console.log('📦 Risposta ElevenLabs:', ttsResponse.status);

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('❌ Errore ElevenLabs:', errorText);
      return {
        statusCode: ttsResponse.status,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Errore dal servizio vocale', details: errorText }),
      };
    }

    const audioBuffer = await ttsResponse.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

    console.log('✅ Audio generato con successo');

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioUrl }),
    };

  } catch (error) {
    console.error('❌ Errore nella generazione audio:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Errore interno del server' }),
    };
  }
};
