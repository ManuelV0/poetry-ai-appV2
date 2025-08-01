import { Handler } from '@netlify/functions'
import { Configuration, OpenAIApi } from 'openai'

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
})

const openai = new OpenAIApi(config)

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Solo richieste POST permesse.' }),
    }
  }

  const { poesia, autore } = JSON.parse(event.body || '{}')

  if (!poesia) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Testo poesia mancante.' }),
    }
  }

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
    const completion = await openai.createChatCompletion({
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

    const content = completion.data.choices[0].message?.content || ''
    const jsonStart = content.indexOf('{')

    if (jsonStart === -1) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Risposta non contiene JSON.' }),
      }
    }

    const jsonText = content.slice(jsonStart).trim()

    return {
      statusCode: 200,
      body: jsonText,
    }
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Errore GPT',
        details: err.message || 'Errore sconosciuto',
      }),
    }
  }
}

export { handler }
