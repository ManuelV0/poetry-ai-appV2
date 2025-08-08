import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Metodo non consentito' }),
    }
  }

  try {
    // Recupera max 5 poesie senza analisi
    const { data: poesie, error } = await supabase
      .from('poesie')
      .select('id, title, content')
      .is('analisi_psicologica', null)
      .limit(5)

    if (error) throw error
    if (!poesie?.length) {
      return { statusCode: 200, body: JSON.stringify({ message: 'Nessuna poesia da analizzare' }) }
    }

    let count = 0

    for (const poesia of poesie) {
      try {
        const prompt = buildPrompt(poesia.content)

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          response_format: { type: "json_object" },
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7
        })

        let analisiGPT
        try {
          analisiGPT = JSON.parse(completion.choices[0].message.content || '{}')
        } catch {
          analisiGPT = generateMockAnalysis(poesia.content)
        }

        const { error: updError } = await supabase
          .from('poesie')
          .update({
            analisi_letteraria: null,
            analisi_psicologica: analisiGPT
          })
          .eq('id', poesia.id)

        if (updError) {
          console.error(`Errore update poesia ${poesia.id}`, updError)
        } else {
          count++
          console.log(`✔ Analizzata poesia ${poesia.id}`)
        }

      } catch (err) {
        console.error('Errore su poesia:', poesia.id, err)
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Analizzate e aggiornate ${count} poesie.` }),
    }

  } catch (error: any) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) }
  }
}

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
        "Sviluppo di tecnologie sostenibili",
        "Mercati di nicchia legati all'adattamento climatico"
      ],
      rischio_esistenziale_da_mitigare: "Collasso ecologico globale"
    }
  }
}

export { handler }
