import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Solo POST permesso' });
  }

  const { text, tone } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Testo mancante' });
  }

  // Simulazione per ora: ritorna un URL fittizio audio
  const audioUrl = `https://example.com/audio-${Date.now()}.mp3`;

  res.status(200).json({ audioUrl });
}
