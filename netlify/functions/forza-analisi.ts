
import 'dotenv/config'
import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

/** Utils env */
const mustGet = (k: string) => {
  const v = process.env[k]
  if (!v) throw new Error(`Missing env: ${k}`)
  return v
}

/** Cly/ients */
const supabase = createClient(
  mustGet('SUPABASE_URL'),
  mustGet('SUPABASE_SERVICE_ROLE_KEY') // service role (server-side only)
)
const openai = new OpenAI({ apiKey: mustGet('OPENAI_API_KEY') })

/** Schema normalizer per analisi_psicologica */
const ensurePsySchema = (obj: any = {}) => ({
  fallacie_logiche: obj.fallacie_logiche ?? [],
  bias_cognitivi: obj.bias_cognitivi ?? [],
  meccanismi_di_difesa: obj.meccanismi_di_difesa ?? [],
  schemi_autosabotanti: obj.schemi_autosabotanti ?? [],
  // Campi opzionali aggiuntivi (non obbligatori per il frontend ma preservati)
  pattern_emotivi: obj.pattern_emotivi ?? [],
  dinamiche_relazionali: obj.dinamiche_relazionali ?? [],
  lessico_emotivo: obj.lessico_emotivo ?? [],
  // Se in passato hai scritto campi "futuristi" dentro lo stesso JSON, preservali:
  vettori_di_cambiamento_attuali: obj.vettori_di_cambiamento_attuali ?? obj["vettori_di_cambiamento_attuali"],
  scenario_ottimistico: obj.scenario_ottimistico ?? obj["scenario_ottimistico"],
  scenario_pessimistico: obj.scenario_pessimistico ?? obj["scenario_pessimistico"],
  fattori_inattesi: obj.fattori_inattesi ?? obj["fattori_inattesi"],
  dossier_strategico_oggi: obj.dossier_strategico_oggi ?? obj["dossier_strategico_oggi"],
})

/** Netlify function */
export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) }
    }
    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing request body' }) }
    }

    const payload = JSON.parse(event.body)
    const { id, content, title, author_name } = payload || {}
    if (!id || !content) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing id or content' }) }
    }

    const poemId = String(id)

    // --- Prompt compatti e robusti ---
    const psychologicalSystem = 'Sei un analista psicologico letterario. Rispondi SOLO in JSON.'
    const psychologicalUser = `
Analizza il testo poetico e restituisci JSON con lo schema esatto:
{
  "fallacie_logiche": [{"nome":"", "evidenze":[""]}],
  "bias_cognitivi": [{"nome":"", "evidenze":[""]}],
  "meccanismi_di_difesa": [{"nome":"", "evidenze":[""]}],
  "schemi_autosabotanti": [{"nome":"", "evidenze":[""]}],
  "pattern_emotivi": [{"nome":"", "evidenze":[""]}],
  "dinamiche_relazionali": [{"nome":"", "evidenze":[""]}],
  "lessico_emotivo": [{"categoria":"", "esempi":["",""]}]
}
Se non trovi elementi per una sezione, usa array vuoti.
TESTO:
<<<${content}>>>
`.trim()

    const letterarySystem = 'Sei un critico letterario. Rispondi SOLO in JSON.'
    const letteraryUser = `
Restituisci JSON con lo schema:
{
  "analisi_tematica_filosofica": {
    "temi_principali": [{ "tema": "", "spiegazione": "", "citazioni": ["", ""] }],
    "temi_secondari": [{ "tema": "", "commento": "", "citazioni": [""] }],
    "tesi_filosofica": ""
  },
  "analisi_stilistica_narratologica": {
    "stile": {"ritmo":"", "lessico":"", "sintassi":""},
    "narratore": "", "tempo_narrativo": "",
    "dispositivi_retorici": [{ "nome":"", "effetto":"" }],
    "personaggi": [{ "nome":"", "arco":"", "motivazioni":"", "meccanismi_di_difesa": ["",""] }]
  },
  "contesto_storico_biografico": {"storico":"", "biografico":""},
  "sintesi_critica_conclusione": {"sintesi":"", "valutazione_finale":""}
}
Se una sezione non si applica, usa stringhe vuote o array vuoti.
TESTO:
<<<${content}>>>
`.trim()

    // --- OpenAI in parallelo ---
    const [psico, lette] = await Promise.all([
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: psychologicalSystem }, { role: 'user', content: psychologicalUser }],
      }),
      openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: letterarySystem }, { role: 'user', content: letteraryUser }],
      }),
    ])

    let analisiPsico: any = {}
    let analisiLett: any = {}
    try { analisiPsico = JSON.parse(psico.choices[0].message.content || '{}') } catch {}
    try { analisiLett  = JSON.parse(lette.choices[0].message.content || '{}') } catch {}

    // --- Merge con stato attuale (no overwrite) ---
    const { data: row, error: selErr } = await supabase
      .from('poesie')
      .select('analisi_psicologica, analisi_letteraria')
      .eq('id', poemId)
      .single()

    if (selErr) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Poesia non trovata', details: selErr.message }) }
    }

    const currentPsy = ensurePsySchema(row?.analisi_psicologica || {})
    const nextPsy = ensurePsySchema({ ...currentPsy, ...analisiPsico })

    const nextLett = { ...(row?.analisi_letteraria || {}), ...(analisiLett || {}) }

    const { error: dbError } = await supabase
      .from('poesie')
      .update({
        analisi_psicologica: nextPsy,
        analisi_letteraria: nextLett
      })
      .eq('id', poemId)y/

    if (dbError) {
      return { statusCode: 500, body: JSON.stringify({ error: 'DB update error', details: dbError.message }) }
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, id: poemId }) }
  } catch (e: any) {
    console.error('forza-analisi error:', e)
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) }
  }
}
