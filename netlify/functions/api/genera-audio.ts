import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * API Route: POST /api/genera-audio
 * Input: JSON con { text: string }
 * Output: JSON con { audioUrl: string } in formato base64 per player <audio>
 */

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo POST ammesso' });
  }

  const { text } = req.body;

  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Testo mancante' });
  }

  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  const VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Voce italiana predefinita di ElevenLabs

  try {
    console.log('Invio richiesta a ElevenLabs per la generazione vocale...');

    const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY || '',
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
    });

    console.log('Stato risposta ElevenLabs:', ttsResponse.status);

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      console.error('Errore ElevenLabs:', errorText);
      return res.status(ttsResponse.status).json({ error: 'Errore dal servizio vocale', details: errorText });
    }

    // Converte l'audio stream in base64 per usarlo direttamente in un tag <audio>
    const audioBuffer = await ttsResponse.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

    // Risposta finale al frontend
    res.status(200).json({ audioUrl });

  } catch (error) {
    console.error('Errore nella generazione audio:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
}
