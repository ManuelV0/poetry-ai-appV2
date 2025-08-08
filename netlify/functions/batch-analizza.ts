
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
        'analisi_psicologica.is.null,analisi_psicologica.eq.{}'
      )

    if (error) throw error

    let count = 0

    for (const poesia of poesie || []) {
      try {
        // 2. Prompt per analisi AI (Futurista Strategico)
        const prompt = `
Agisci come un "Futurista Strategico" e un analista di sistemi complessi.
Il tuo compito non è predire il futuro, ma mappare le sue possibilità per fornire un vantaggio decisionale.

Argomento: ${poesia.content}

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
- Pensa in modo sistemico: le conclusioni devono derivare dall'interconnessione dei punti.
- Tono lucido, strategico e privo di sensazionalismo.
- Usa esempi concreti per illustrare i tuoi punti.
`
        // 3. Chiamata a OpenAI
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7
        })

        let analisiGPT: any
        try {
          analisiGPT = JSON.parse(completion.choices[0].message.content || '{}')
        } catch {
          analisiGPT = {}
        }

        // 4. Aggiorna la poesia nel DB con il dossier strategico
        const { error: updError } = await supabase
          .from('poesie')
          .update({
            analisi_letteraria: null, // non più usata dal nuovo front-end
            analisi_psicologica: analisiGPT
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
