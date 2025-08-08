/// netlify/functions/forza-analisi.ts
import type { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// === Supabase + OpenAI ===
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // assicurati che l'env abbia questo nome su Netlify
)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

// === Utils ===
const isObj = (v: any) => v && typeof v === 'object' && !Array.isArray(v)
const arr = (v: any) => Array.isArray(v) ? v.filter(Boolean) : []
const s = (v: any) => (typeof v === 'string' && v.trim()) ? v.trim() : 'N/A'

const toNameEvidenze = (item: any) => {
  if (typeof item === 'string') return { nome: s(item), evidenze: [] as string[] }
  return {
    nome: s(item?.nome),
    evidenze: arr(item?.evidenze).map(s)
  }
}
const toCategoriaEsempi = (item: any) => {
  if (typeof item === 'string') return { categoria: s(item), esempi: [] as string[] }
  return {
    categoria: s(item?.categoria),
    esempi: arr(item?.esempi).map(s)
  }
}

// =============== PSICOLOGICA ===============
function sanitizePsico(x: any) {
  const out: any = {}

  // accetta stringhe o oggetti -> standardizza a {nome, evidenze[]}
  out.fallacie_logiche     = arr(x?.fallacie_logiche).map(toNameEvidenze)
  out.bias_cognitivi       = arr(x?.bias_cognitivi).map(toNameEvidenze)
  out.meccanismi_di_difesa = arr(x?.meccanismi_di_difesa).map(toNameEvidenze)
  out.schemi_autosabotanti = arr(x?.schemi_autosabotanti).map(toNameEvidenze)
  out.pattern_emotivi      = arr(x?.pattern_emotivi).map(toNameEvidenze)
  out.dinamiche_relazionali= arr(x?.dinamiche_relazionali).map(toNameEvidenze)
  out.lessico_emotivo      = arr(x?.lessico_emotivo).map(toCategoriaEsempi)

  // compat: eventuale schema “futurista strategico” (opzionale)
  if (
    Array.isArray(x?.vettori_di_cambiamento_attuali) ||
    x?.scenario_ottimistico || x?.scenario_pessimistico ||
    isObj(x?.fattori_inattesi) || isObj(x?.dossier_strategico_oggi)
  ) {
    out.vettori_di_cambiamento_attuali = arr(x?.vettori_di_cambiamento_attuali).map(s)
    out.scenario_ottimistico = s(x?.scenario_ottimistico)
    out.scenario_pessimistico = s(x?.scenario_pessimistico)
    out.fattori_inattesi = {
      positivo_jolly: s(x?.fattori_inattesi?.positivo_jolly),
      negativo_cigno_nero: s(x?.fattori_inattesi?.negativo_cigno_nero)
    }
    out.dossier_strategico_oggi = {
      azioni_preparatorie_immediate: arr(x?.dossier_strategico_oggi?.azioni_preparatorie_immediate).map(s),
      opportunita_emergenti: arr(x?.dossier_strategico_oggi?.opportunita_emergenti).map(s),
      rischio_esistenziale_da_mitigare: s(x?.dossier_strategico_oggi?.rischio_esistenziale_da_mitigare)
    }
  }

  return out
}

// =============== LETTERARIA ===============
function sanitizeLetteraria(x: any) {
  const out: any = {}

  const temi = x?.analisi_tematica_filosofica || {}
  out.analisi_tematica_filosofica = {
    temi_principali: Array.isArray(temi?.temi_principali)
      ? temi.temi_principali.map((t: any) => ({
          tema: s(t?.tema ?? (typeof t === 'string' ? t : '')),
          spiegazione: s(t?.spiegazione),
          citazioni: arr(t?.citazioni).map(s)
        }))
      : [],
    temi_secondari: Array.isArray(temi?.temi_secondari)
      ? temi.temi_secondari.map((t: any) => ({
          tema: s(t?.tema ?? (typeof t === 'string' ? t : '')),
          commento: s(t?.commento),
          citazioni: arr(t?.citazioni).map(s)
        }))
      : [],
    tesi_filosofica: s(temi?.tesi_filosofica)
  }

  const stil = x?.analisi_stilistica_narratologica || {}
  // accetta sia stringa che oggetto { ritmo, lessico, sintassi }
  let stileField: any = 'N/A'
  if (typeof stil?.stile === 'string') {
    stileField = stil.stile
  } else if (isObj(stil?.stile)) {
    stileField = {
      ritmo: s(stil?.stile?.ritmo),
      lessico: s(stil?.stile?.lessico),
      sintassi: s(stil?.stile?.sintassi)
    }
  } else {
    stileField = { ritmo: 'N/A', lessico: 'N/A', sintassi: 'N/A' }
  }

  out.analisi_stilistica_narratologica = {
    stile: stileField,
    narratore: s(stil?.narratore),
    tempo_narrativo: s(stil?.tempo_narrativo),
    dispositivi_retorici: Array.isArray(stil?.dispositivi_retorici)
      ? stil.dispositivi_retorici.map((d: any) => ({
          nome: s(d?.nome),
          effetto: s(d?.effetto)
        }))
      : [],
    personaggi: Array.isArray(stil?.personaggi)
      ? stil.personaggi.map((p: any) => ({
          nome: s(p?.nome),
          arco: s(p?.arco),
          motivazioni: s(p?.motivazioni),
          meccanismi_di_difesa: arr(p?.meccanismi_di_difesa).map(s)
        }))
      : []
  }

  const ctx = x?.contesto_storico_biografico || {}
  out.contesto_storico_biografico = {
    storico: s(ctx?.storico),
    biografico: s(ctx?.biografico)
  }

  const sint = x?.sintesi_critica_conclusione
  out.sintesi_critica_conclusione =
    typeof sint === 'string'
      ? s(sint)
      : isObj(sint)
      ? {
          sintesi: s(sint?.sintesi),
          valutazione_finale: s(sint?.valutazione_finale)
        }
      : { sintesi: 'N/A', valutazione_finale: 'N/A' }

  return out
}

// =============== PROMPT ===============
function buildPromptPsico(content: string) {
  return `
Agisci come un analista brutalmente onesto ma accurato.
Compito: sul TESTO (poesia) qui sotto, individua TUTTO quanto segue. Ogni voce con EVIDENZE (citazioni brevi, «...»).
Regole: niente invenzioni, solo JSON valido conforme allo schema.

Schema:
{
  "fallacie_logiche": [{"nome":"...", "evidenze":["..."]}],
  "bias_cognitivi": [{"nome":"...", "evidenze":["..."]}],
  "meccanismi_di_difesa": [{"nome":"...", "evidenze":["..."]}],
  "schemi_autosabotanti": [{"nome":"...", "evidenze":["..."]}],
  "pattern_emotivi": [{"nome":"...", "evidenze":["..."]}],
  "dinamiche_relazionali": [{"nome":"...", "evidenze":["..."]}],
  "lessico_emotivo": [{"categoria":"...", "esempi":["...","..."]}]
}

TESTO:
"""${content}"""
`.trim()
}

function buildPromptLetteraria(content: string, title?: string, author?: string) {
  return `
Agisci come un critico letterario accademico (strutturalismo + psicanalisi + contesto).
Rispondi SOLO con JSON valido conforme allo schema.

Schema:
{
  "analisi_tematica_filosofica": {
    "temi_principali": [
      { "tema": "...", "spiegazione": "...", "citazioni": ["...","...","..."] }
    ],
    "temi_secondari": [
      { "tema": "...", "commento": "...", "citazioni": ["..."] }
    ],
    "tesi_filosofica": "..."
  },
  "analisi_stilistica_narratologica": {
    "stile": { "ritmo": "...", "lessico": "...", "sintassi": "..." },
    "narratore": "...",
    "tempo_narrativo": "...",
    "dispositivi_retorici": [{ "nome": "...", "effetto": "..." }],
    "personaggi": [{ "nome": "...", "arco": "...", "motivazioni": "...", "meccanismi_di_difesa": ["..."] }]
  },
  "contesto_storico_biografico": {
    "storico": "...",
    "biografico": "..."
  },
  "sintesi_critica_conclusione": {
    "sintesi": "...",
    "valutazione_finale": "..."
  }
}

Titolo: ${title || 'Senza titolo'}
Autore: ${author || 'Anonimo/Non noto'}

TESTO:
"""${content}"""
`.trim()
}

// =============== Handler ===============
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  let body: { id?: string; content?: string; title?: string; author_name?: string } = {}
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON non valido' }) }
  }

  if (!body.id || !body.content) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Campi obbligatori: id, content' }) }
  }

  // 1) Analisi PSICOLOGICA
  let psicoRaw: any = {}
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.35,
      frequency_penalty: 0.2,
      messages: [{ role: 'user', content: buildPromptPsico(body.content) }]
    })
    psicoRaw = JSON.parse(completion.choices[0].message.content || '{}')
  } catch {
    psicoRaw = {
      fallacie_logiche: [],
      bias_cognitivi: [],
      meccanismi_di_difesa: [],
      schemi_autosabotanti: [],
      pattern_emotivi: [],
      dinamiche_relazionali: [],
      lessico_emotivo: []
    }
  }
  const analisi_psicologica = sanitizePsico(psicoRaw)

  // 2) Analisi LETTERARIA
  let lettRaw: any = {}
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.45,
      frequency_penalty: 0.2,
      messages: [{ role: 'user', content: buildPromptLetteraria(body.content, body.title, body.author_name) }]
    })
    lettRaw = JSON.parse(completion.choices[0].message.content || '{}')
  } catch {
    lettRaw = {
      analisi_tematica_filosofica: { temi_principali: [], temi_secondari: [], tesi_filosofica: "" },
      analisi_stilistica_narratologica: {
        stile: { ritmo: "", lessico: "", sintassi: "" },
        narratore: "",
        tempo_narrativo: "",
        dispositivi_retorici: [],
        personaggi: []
      },
      contesto_storico_biografico: { storico: "", biografico: "" },
      sintesi_critica_conclusione: { sintesi: "", valutazione_finale: "" }
    }
  }
  const analisi_letteraria = sanitizeLetteraria(lettRaw)

  // 3) Salvataggio su DB
  try {
    const { error: updError } = await supabase
      .from('poesie')
      .update({ analisi_psicologica, analisi_letteraria })
      .eq('id', body.id)

    if (updError) throw updError
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Errore update DB', details: err.message }) }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true, poesia_id: body.id, analisi_psicologica, analisi_letteraria })
  }
}
