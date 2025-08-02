import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// --- Configurazione Supabase e OpenAI
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

const handler: Handler = async (event) => {
  // Consenti solo richieste GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Metodo non consentito' }),
    }
  }

  try {
    // 1. Recupera poesie senza analisi o con analisi vuota
    const { data: poesie, error } = await supabase
      .from('poesie')
      .select('id, title, content, analisi_letteraria, analisi_psicologica')
      .or(
        'analisi_letteraria.is.null,analisi_psicologica.is.null,analisi_letteraria.eq.{},analisi_psicologica.eq.{}'
      )

    if (error) throw error

    let count = 0

    for (const poesia of poesie || []) {
      try {
        // 2. Prompt per analisi AI
        const prompt = `
Agisci come critico letterario e psicologo. Analizza la poesia seguente nei seguenti due blocchi:

1. Analisi Letteraria:
- Stile
- Temi
- Struttura
- Eventuali riferimenti culturali

2. Analisi Psicologica:
- Emozioni
- Stato interiore del poeta
- Visione del mondo

Rispondi in JSON come segue:

{
  "analisi_letteraria": {
    "stile_letterario": "...",
    "temi": ["...", "..."],
    "struttura": "...",
    "riferimenti_culturali": "..."
  },
  "analisi_psicologica": {
    "emozioni": ["...", "..."],
    "stato_interno": "...",
    "visione_del_mondo": "..."
  }
}

POESIA:
${poesia.content}
`
        // 3. Chiamata a OpenAI
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7
        })

        let analisiGPT
        try {
          analisiGPT = JSON.parse(completion.choices[0].message.content || '{}')
        } catch {
          analisiGPT = { analisi_letteraria: {}, analisi_psicologica: {} }
        }

        // 4. Aggiorna la poesia nel DB con le nuove analisi
        const { error: updError } = await supabase
          .from('poesie')
          .update({
            analisi_letteraria: analisiGPT.analisi_letteraria,
            analisi_psicologica: analisiGPT.analisi_psicologica,
          })
          .eq('id', poesia.id)

        if (!updError) {
          count++
          console.log(`✔ Analizzata poesia ${poesia.id}`)
        } else {
          console.error(`Errore update poesia ${poesia.id}`, updError)
        }
      } catch (err) {
        console.error('Errore su poesia:', poesia.id, err)
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Analizzate e aggiornate ${count} poesie.`,
      }),
    }
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    }
  }
}

export { handler }
