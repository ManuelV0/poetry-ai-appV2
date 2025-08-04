import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Usa la service key (solo lato server!)
);

// Voce base italiana ElevenLabs
const VOICE_ID_DEFAULT = '21m00Tcm4TlvDq8ikWAM';
// Puoi creare una tabella di mapping tono-voce qui:
const VOICE_MAP: Record<string, string> = {
  malinconico: 'YOUR_MELANCHOLY_VOICE_ID',
  euforico: 'YOUR_EUPHORIC_VOICE_ID',
  // ... aggiungi altri toni!
  neutro: VOICE_ID_DEFAULT
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo POST ammesso' });
  }

  // 1. Recupera testo (e tono, opzionale) dalla richiesta
  let { text, poesia_id, tono: tonoRequest } = req.body as {
    text?: string;
    poesia_id?: number | string;
    tono?: string;
  };

  // Se arriva poesia_id, prendi dati da Supabase
  if (poesia_id && !text) {
    const { data: poesia, error } = await supabase
      .from('poesie')
      .select('content, analisi_psicologica')
      .eq('id', poesia_id)
      .single();

    if (error || !poesia) {
      return res.status(404).json({ error: 'Poesia non trovata' });
    }
    text = poesia.content;
    try {
      let analisi = poesia.analisi_psicologica;
      if (typeof analisi === 'string') analisi = JSON.parse(analisi);
      if (!tonoRequest) tonoRequest = analisi.tono_emotivo || undefined;
    } catch {}
  }

  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Testo mancante' });
  }

  // 2. Scegli voiceID in base al tono (se fornito)
  const tonoKey = (tonoRequest || 'neutro').toLowerCase();
  const VOICE_ID = VOICE_MAP[tonoKey] || VOICE_ID_DEFAULT;

  // 3. Richiesta a ElevenLabs (stream output)
  try {
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
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

    if (!ttsResponse.ok) {
      const errorText = await ttsResponse.text();
      return res.status(ttsResponse.status).json({
        error: 'Errore dal servizio vocale ElevenLabs',
        details: errorText
      });
    }

    // Audio in buffer → base64
    const audioBuffer = await ttsResponse.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');
    const audioUrl = `data:audio/mpeg;base64,${audioBase64}`;

    // (Se vuoi, qui puoi aggiungere logica per upload su Supabase Storage!)

    return res.status(200).json({ audioUrl });

  } catch (error) {
    console.error('Errore nella generazione audio:', error);
    return res.status(500).json({ error: 'Errore interno del server', details: String(error) });
  }
}
