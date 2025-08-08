import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// Setup Supabase e OpenAI
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

const handler: Handler = async (event) => {
  // Consente solo POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Metodo non consentito. Usa POST.' })
    }
  }

  try {
    const body = JSON.parse(event.body || '{}')
    const { id, content } = body

    if (!id || !content) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'ID e content sono obbligatori' })
      }
    }

    const prompt = buildPrompt(content)

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    })

    let analisiGPT
    try {
      analisiGPT = JSON.parse(completion.choices[0].message.content || '{}')
    } catch {
      analisiGPT = generateMockAnalysis(content)
    }

    const { error } = await supabase
      .from('poesie')
      .update({
        analisi_letteraria: null,
        analisi_psicologica: analisiGPT
      })
      .eq('id', id)

    if (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Analisi generata con successo', analisi: analisiGPT })
    }

  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || 'Errore sconosciuto' })
    }
  }
}

// === Prompt per OpenAI ===
function buildPrompt(content: string) {
  return `
Agisci come un "Futurista Strategico" e un analista di sistemi complessi.
Il tuo compito non è predire il futuro, ma mappare le sue possibilità per fornire un vantaggio decisionale.

Argomento: ${content}

Proiettalo 20 anni nel futuro e crea un dossier strategico completo in formato JSON con la seguente struttura obbligatoria:

{
  "vettori_di_cambiamento_attuali": [
    "Descrizione del vettore 1",
    "Descrizione del vettore 2",
    "Descrizione del vettore 3"
  ],
  "scenario_ottimistico": "Descrizione dettagliata dell'utopia plausibile",
  "scenario_pessimistico": "Descrizione dettagliata della distopia plausibile",
  "fattori_inattesi": {
    "positivo_jolly": "Evento positivo imprevisto",
    "negativo_cigno_nero": "Evento negativo imprevisto"
  },
  "dossier_strategico_oggi": {
    "azioni_preparatorie_immediate": [
      "Azione 1",
      "Azione 2",
      "Azione 3"
    ],
    "opportunita_emergenti": [
      "Opportunità 1",
      "Opportunità 2"
    ],
    "rischio_esistenziale_da_mitigare": "Descrizione del rischio"
  }
}

Requisiti:
- Pensa in modo sistemico.
- Tono lucido, strategico e privo di sensazionalismo.
- Usa esempi concreti.
`
}

// === Mock fallback ===
function generateMockAnalysis(content: string) {
  return {
    vettori_di_cambiamento_attuali: [
      "Avanzamenti tecnologici generici",
      "Cambiamenti sociali globali",
      "Tendenze economiche emergenti"
    ],
    scenario_ottimistico: "Scenario positivo con cooperazione globale e uso etico delle tecnologie.",
    scenario_pessimistico: "Scenario negativo con crisi geopolitiche e tecnologie usate male.",
    fattori_inattesi: {
      positivo_jolly: "Scoperta scientifica rivoluzionaria.",
      negativo_cigno_nero: "Evento catastrofico imprevisto."
    },
    dossier_strategico_oggi: {
      azioni_preparatorie_immediate: [
        "Investire in formazione continua",
        "Diversificare le fonti di reddito",
        "Creare reti di collaborazione"
      ],
      opportunita_emergenti: [
        "Tecnologie sostenibili",
        "Mercati legati all’adattamento climatico"
      ],
      rischio_esistenziale_da_mitigare: "Collasso ecologico globale"
    }
  }
}

export { handler }
