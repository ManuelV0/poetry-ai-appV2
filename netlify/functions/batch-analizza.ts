import 'dotenv/config'
import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

/** ENV helpers */
const mustGet = (k: string) => {
  const v = process.env[k]
  if (!v) throw new Error(`Missing env: ${k}`)
  return v
}

/** Clients */
const supabase = createClient(
  mustGet('SUPABASE_URL'),
  mustGet('SUPABASE_SERVICE_ROLE_KEY') // service role (server-side only)
)
const openai = new OpenAI({ apiKey: mustGet('OPENAI_API_KEY') })

/** Optional endpoint protection */
const JOB_SECRET = process.env.JOB_SECRET || ''

/** Utils */
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/** Prompt futurista (JSON) */
const buildFuturistPrompt = (content: string) => `
Agisci come un "Futurista Strategico".
Mappa possibilità a 20 anni sul tema seguente e restituisci SOLO un JSON valido con lo schema:

{
  "vettori_di_cambiamento_attuali": [
    "Descrizione 1",
    "Descrizione 2",
    "Descrizione 3"
  ],
  "scenario_ottimistico": "Testo",
  "scenario_pessimistico": "Testo",
  "fattori_inattesi": {
    "positivo_jolly": "Testo",
    "negativo_cigno_nero": "Testo"
  },
  "dossier_strategico_oggi": {
    "azioni_preparatorie_immediate": ["Azione 1","Azione 2","Azione 3"],
    "opportunita_emergenti": ["Opportunità 1","Opportunità 2"],
    "rischio_esistenziale_da_mitigare": "Testo"
  }
}

Tono lucido e non sensazionalista. Usa esempi concreti.
ARGOMENTO:
${content}
`.trim()

/** Fallback mock in caso di JSON malformato */
const generateMockFuturist = () => ({
  vettori_di_cambiamento_attuali: [
    'Avanzamenti tecnologici generici',
    'Cambiamenti sociali globali',
    'Tendenze economiche emergenti',
  ],
  scenario_ottimistico:
    'Scenario positivo con cooperazione globale e uso etico delle tecnologie.',
  scenario_pessimistico:
    'Scenario negativo con crisi geopolitiche e tecnologie usate male.',
  fattori_inattesi: {
    positivo_jolly: 'Scoperta scientifica rivoluzionaria.',
    negativo_cigno_nero: 'Evento catastrofico imprevisto.',
  },
  dossier_strategico_oggi: {
    azioni_preparatorie_immediate: [
      'Investire in formazione continua',
      'Diversificare le fonti di reddito',
      'Creare reti di collaborazione',
    ],
    opportunita_emergenti: [
      'Sviluppo di tecnologie sostenibili',
      'Mercati di nicchia legati all’adattamento climatico',
    ],
    rischio_esistenziale_da_mitigare: 'Collasso ecologico globale',
  },
})

/** Merge helper: preserva tutto ciò che esiste in analisi_psicologica e aggiunge la sezione futurista */
const mergePsyAndFuturist = (current: any, futurist: any) => {
  const base = current && typeof current === 'object' ? current : {}
  return {
    ...base,
    ...futurist, // scrive/aggiorna SOLO le chiavi futuriste; le altre (psico) restano
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  // opzionale: header segreto per limitare l’accesso pubblico
  if (JOB_SECRET) {
    const got = event.headers['x-job-secret'] || event.headers['X-Job-Secret']
    if (got !== JOB_SECRET) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized' }),
      }
    }
  }

  try {
    // Prendi fino a 5 poesie con analisi_psicologica nulla o vuota ({}).
    const { data: poesie, error } = await supabase
      .from('poesie')
      .select('id, title, content, analisi_psicologica, analisi_letteraria')
      .or('analisi_psicologica.is.null,analisi_psicologica.eq.{}')
      .not('content', 'is', null)
      .limit(5)

    if (error) throw error
    if (!poesie?.length) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Nessuna poesia da analizzare' }),
      }
    }

    let updated = 0

    for (const poesia of poesie) {
      const text = (poesia.content || '').trim()
      if (!text) continue

      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: buildFuturistPrompt(text) }],
          temperature: 0.7,
        })

        let futurist: any
        try {
          futurist = JSON.parse(completion.choices[0].message.content || '{}')
          // se JSON vuoto, usa mock per evitare scrittura inutile
          if (!futurist || Object.keys(futurist).length === 0) futurist = generateMockFuturist()
        } catch {
          futurist = generateMockFuturist()
        }

        const mergedPsy = mergePsyAndFuturist(poesia.analisi_psicologica, futurist)

        const { error: updErr } = await supabase
          .from('poesie')
          .update({
            analisi_psicologica: mergedPsy,
            // NON azzerare l’analisi letteraria se già presente
            analisi_letteraria: poesia.analisi_letteraria ?? null,
          })
          .eq('id', poesia.id)

        if (updErr) {
          console.error(`Errore update poesia ${poesia.id}`, updErr)
        } else {
          updated++
          console.log(`✔ Aggiornata poesia ${poesia.id}`)
        }

        // Rate limit di cortesia
        await sleep(800)
      } catch (err) {
        console.error('Errore su poesia:', poesia.id, err)
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Analizzate e aggiornate ${updated} poesie.` }),
    }
  } catch (err: any) {
    console.error('Errore generale:', err)
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    }
  }
}
