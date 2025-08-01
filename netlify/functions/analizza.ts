import { Handler } from '@netlify/functions'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

// 🔑 OpenAI setup
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// 🔐 Supabase client con Service Role Key (solo lato server!)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!, // ok usare VITE_ qui, viene da Netlify env
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ⚠️ questa NON deve avere VITE_ nel nome
)

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Solo richieste POST permesse.' }),
    }
  }

  const { poesia, autore = 'Anonimo', title = '' } = JSON.parse(event.body || '{}')

  if (!poesia) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Testo poesia mancante.' }),
    }
  }

  // 🎯 Prompt per OpenAI
  const prompt = `
Agisci come critico letterario e psicologo. Analizza la poesia seguente e restituisci un JSON compatto ma ispirato con:

{
  "analisi_letteraria": {
    "tono": "...",
    "stile": "...",
    "temi": ["...", "..."],
    "figure_retoriche": ["..."],
    "riferimenti_culturali": "...",
    "registro_linguistico": "..."
  },
  "analisi_psicologica": {
    "emozioni": ["...", "..."],
    "visione_del_mondo": "...",
    "tratti_di_personalità": "...",
    "profilo_poetico": "...",
    "descrizione_breve": "..."
  }
}

POESIA:
${poesia}
`.trim()

  try {
    // 🔎 Chiamata a OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Sei un esperto di poesia e psicologia letteraria.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    })

    const content = completion.choices[0]?.message?.content || ''
    const jsonStart = content.indexOf('{')
    if (jsonStart === -1) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Risposta non contiene JSON.' }),
      }
    }

    const analisi = JSON.parse(content.slice(jsonStart).trim())

    // 💾 Inserimento in Supabase
    const { error, data } = await supabase
      .from('poesie')
      .insert([
        {
          title,
          autore,
          content: poesia,
          analisi_letteraria: analisi.analisi_letteraria,
          analisi_psicologica: analisi.analisi_psicologica,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Errore inserimento Supabase:', error)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Errore inserimento Supabase', details: error.message }),
      }
    }

    // ✅ Ritorna i dati inseriti
    return {
      statusCode: 200,
      body: JSON.stringify(data),
    }
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Errore GPT o DB',
        details: err.message || 'Errore sconosciuto',
      }),
    }
  }
}

export { handler }
