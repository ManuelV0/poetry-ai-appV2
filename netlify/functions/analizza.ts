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

  const { poesia, author_name = 'Anonimo', title = '' } = JSON.parse(event.body || '{}')

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
    console.log('🧠 Risposta GPT completa:', content)

    // Estrai il primo JSON ben formato dalla risposta
    const match = content.match(/\{[\s\S]*\}/)
    if (!match) {
      console.error('❌ JSON non trovato nella risposta GPT:', content)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Risposta GPT non contiene JSON valido.' }),
      }
    }

    let analisi
    try {
      analisi = JSON.parse(match[0])
    } catch (parseErr) {
      console.error('❌ Errore parsing JSON:', parseErr, '\nContenuto:', match[0])
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Errore parsing JSON', details: parseErr.message }),
      }
    }

    // 💾 Inserimento in Supabase
    const inserimento = {
      title,
      author_name,
      content: poesia,
      analisi_letteraria: analisi.analisi_letteraria,
      analisi_psicologica: analisi.analisi_psicologica,
    }

    console.log('📤 Inserimento nel DB:', inserimento)

    const { error, data } = await supabase
      .from('poesie')
      .insert([inserimento])
      .select()
      .single()

    if (error) {
      console.error('❌ Errore inserimento Supabase:', error)
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Errore inserimento Supabase', details: error.message }),
      }
    }

    console.log('✅ Inserimento avvenuto con successo:', data)

    return {
      statusCode: 200,
      body: JSON.stringify(data),
    }
  } catch (err: any) {
    console.error('❌ Errore GPT o altro:', err)
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
