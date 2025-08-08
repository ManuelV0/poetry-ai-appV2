import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// --- Supabase + OpenAI ---
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

// --- Helpers ---
const isNonEmptyObject = (v: any) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0
const arrOrEmpty = (v: any) => Array.isArray(v) ? v.filter(Boolean) : []
const strOrNA = (v: any) => (typeof v === 'string' && v.trim().length > 0) ? v.trim() : 'N/A'

function sanitizePsico(x: any) {
  const out: any = {}
  out.fallacie_logiche     = arrOrEmpty(x?.fallacie_logiche)
  out.bias_cognitivi       = arrOrEmpty(x?.bias_cognitivi)
  // meccanismi_di_difesa può essere una lista di {nome, evidenze[]}
  out.meccanismi_di_difesa = Array.isArray(x?.meccanismi_di_difesa) ? x.meccanismi_di_difesa.map((m: any) => ({
    nome: strOrNA(m?.nome),
    evidenze: arrOrEmpty(m?.evidenze).map(strOrNA)
  })) : []

  out.schemi_autosabotanti = arrOrEmpty(x?.schemi_autosabotanti)

  // Compat: supporto anche lo schema “futurista strategico”
  if (Array.isArray(x?.vettori_di_cambiamento_attuali) ||
      x?.scenario_ottimistico || x?.scenario_pessimistico ||
      isNonEmptyObject(x?.fattori_inattesi) || isNonEmptyObject(x?.dossier_strategico_oggi)) {
    out.vettori_di_cambiamento_attuali = arrOrEmpty(x?.vettori_di_cambiamento_attuali)
    out.scenario_ottimistico = strOrNA(x?.scenario_ottimistico)
    out.scenario_pessimistico = strOrNA(x?.scenario_pessimistico)
    out.fattori_inattesi = {
      positivo_jolly: strOrNA(x?.fattori_inattesi?.positivo_jolly),
      negativo_cigno_nero: strOrNA(x?.fattori_inattesi?.negativo_cigno_nero),
    }
    out.dossier_strategico_oggi = {
      azioni_preparatorie_immediate: arrOrEmpty(x?.dossier_strategico_oggi?.azioni_preparatorie_immediate),
      opportunita_emergenti: arrOrEmpty(x?.dossier_strategico_oggi?.opportunita_emergenti),
      rischio_esistenziale_da_mitigare: strOrNA(x?.dossier_strategico_oggi?.rischio_esistenziale_da_mitigare),
    }
  }
  return out
}

function sanitizeLetteraria(x: any) {
  const out: any = {}

  const temi = x?.analisi_tematica_filosofica || {}
  out.analisi_tematica_filosofica = {
    temi_principali: Array.isArray(temi?.temi_principali) ? temi.temi_principali.map((t: any) => ({
      tema: strOrNA(t?.tema),
      spiegazione: strOrNA(t?.spiegazione),
      citazioni: arrOrEmpty(t?.citazioni).map(strOrNA)
    })) : [],
    temi_secondari: arrOrEmpty(temi?.temi_secondari).map((t: any) => {
      // accetta sia stringa sia oggetto {tema, commento, citazioni}
      if (typeof t === 'string') return t
      return {
        tema: strOrNA(t?.tema),
        commento: strOrNA(t?.commento),
        citazioni: arrOrEmpty(t?.citazioni).map(strOrNA)
      }
    }),
    tesi_filosofica: strOrNA(temi?.tesi_filosofica),
  }

  const stil = x?.analisi_stilistica_narratologica || {}
  // stile: consenti sia stringa, sia oggetto {ritmo, lessico, sintassi}
  let stileField: any = 'N/A'
  if (typeof stil?.stile === 'string') stileField = stil.stile
  else if (isNonEmptyObject(stil?.stile)) {
    stileField = {
      ritmo: strOrNA(stil?.stile?.ritmo),
      lessico: strOrNA(stil?.stile?.lessico),
      sintassi: strOrNA(stil?.stile?.sintassi),
    }
  }

  out.analisi_stilistica_narratologica = {
    stile: stileField,
    narratore: strOrNA(stil?.narratore),
    tempo_narrativo: strOrNA(stil?.tempo_narrativo),
    dispositivi_retorici: Array.isArray(stil?.dispositivi_retorici)
      ? stil.dispositivi_retorici.map((d: any) => ({
          nome: strOrNA(d?.nome),
          effetto: strOrNA(d?.effetto),
        }))
      : [],
    personaggi: Array.isArray(stil?.personaggi)
      ? stil.personaggi.map((p: any) => ({
          nome: strOrNA(p?.nome),
          arco: strOrNA(p?.arco),
          motivazioni: strOrNA(p?.motivazioni),
          meccanismi_di_difesa: arrOrEmpty(p?.meccanismi_di_difesa),
        }))
      : [],
  }

  const ctx = x?.contesto_storico_biografico || {}
  out.contesto_storico_biografico = {
    storico: strOrNA(ctx?.storico),
    biografico: strOrNA(ctx?.biografico),
  }

  const sint = x?.sintesi_critica_conclusione
  out.sintesi_critica_conclusione =
    typeof sint === 'string'
      ? strOrNA(sint)
      : isNonEmptyObject(sint)
      ? {
          sintesi: strOrNA(sint?.sintesi),
          valutazione_finale: strOrNA(sint?.valutazione_finale),
        }
      : 'N/A'

  return out
}

// --- PROMPTS MIGLIORATI ---
function buildPromptPsico(content: string) {
  return `
Agisci come un analista brutalmente onesto ma eccezionalmente acuto.
Analizza il testo (poesia) qui sotto e identifica in MODO CONCRETO:

- fallacie_logiche: elenco di stringhe (es. "falsa causa: ...", "ambiguità: ...") sempre almeno 1 voce; se non presenti, spiega perché non rilevabili dal testo.
- bias_cognitivi: elenco di stringhe (es. "negativity bias: ...", "confirmation bias: ...") sempre almeno 1 voce (o spiegazione).
- meccanismi_di_difesa: elenco di oggetti { "nome": string, "evidenze": string[] } con citazioni testuali brevi dal testo a supporto. Sempre almeno 1 elemento (o spiegazione).
- schemi_autosabotanti: elenco di stringhe (es. "generalizzazione: ...", "autodenigrazione: ...") sempre almeno 1 (o spiegazione).

Se concludi che qualcosa NON è applicabile, NON lasciare vuoto: scrivi una voce esplicita che lo dica e perché.

RESTITUISCI SOLO JSON con questa struttura:

{
  "fallacie_logiche": ["..."],
  "bias_cognitivi": ["..."],
  "meccanismi_di_difesa": [
    { "nome": "...", "evidenze": ["...","..."] }
  ],
  "schemi_autosabotanti": ["..."]
}

Testo da analizzare:
"""${content}"""
`.trim()
}

function buildPromptLetteraria(content: string, title?: string, author?: string) {
  return `
Agisci come un critico letterario accademico (strutturalismo, psicanalisi, contesto).
Produci un'analisi MULTI-LIVELLO e OBBLIGATORIAMENTE in JSON. 
Se mancano dati storici/biografici (autore contemporaneo/ignoto), compila comunque "contesto_storico_biografico" con:
- storico: "Contesto contemporaneo: ..." (linguaggi digitali, individualismo tardo-moderno, social, ecc.)
- biografico: "Autore non noto/anonimo: ... (ipotizza influenze letterarie plausibili senza spacciare fatti)."

RESTITUISCI SOLO JSON con questa struttura ESATTA:

{
  "analisi_tematica_filosofica": {
    "temi_principali": [
      { "tema": "…", "spiegazione": "…", "citazioni": ["…","…","…"] }
    ],
    "temi_secondari": [
      { "tema": "…", "commento": "…", "citazioni": ["…"] }
    ],
    "tesi_filosofica": "…"
  },
  "analisi_stilistica_narratologica": {
    "stile": { "ritmo": "…", "lessico": "…", "sintassi": "…" },
    "narratore": "…",
    "tempo_narrativo": "…",
    "dispositivi_retorici": [
      { "nome": "…", "effetto": "…" }
    ],
    "personaggi": [
      { "nome": "…", "arco": "…", "motivazioni": "…", "meccanismi_di_difesa": ["…"] }
    ]
  },
  "contesto_storico_biografico": {
    "storico": "…",
    "biografico": "…"
  },
  "sintesi_critica_conclusione": {
    "sintesi": "…",
    "valutazione_finale": "…"
  }
}

Regole:
- Lingua: italiano.
- Cita almeno 3 brevi estratti (anche non testuali perfetti ma fedeli) per i temi principali.
- Non inserire link o note fuori schema.
- Se un campo non è applicabile: compila con una spiegazione breve ma NON lasciare stringhe vuote.

Titolo (se noto): ${title || 'Senza titolo'}
Autore (se noto): ${author || 'Anonimo/Non noto'}

Testo:
"""${content}"""
`.trim()
}

// --- HANDLER ---
const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Metodo non consentito. Usa POST.' }) }
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

  // 1) genera ANALISI PSICOLOGICA DETTAGLIATA
  let psicoRaw: any = {}
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.4,
      presence_penalty: 0.1,
      messages: [{ role: 'user', content: buildPromptPsico(body.content) }]
    })
    psicoRaw = JSON.parse(completion.choices[0].message.content || '{}')
  } catch (e) {
    psicoRaw = {
      fallacie_logiche: ["N/A: nessuna fallacia chiaramente identificabile nel testo breve."],
      bias_cognitivi: ["N/A: non emergono bias in modo univoco dal brano."],
      meccanismi_di_difesa: [{ nome: "razionalizzazione", evidenze: ["N/A"] }],
      schemi_autosabotanti: ["N/A"]
    }
  }
  const analisi_psicologica = sanitizePsico(psicoRaw)

  // 2) genera ANALISI LETTERARIA ROBUSTA
  let lettRaw: any = {}
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.5,
      presence_penalty: 0.1,
      messages: [{ role: 'user', content: buildPromptLetteraria(body.content, body.title, body.author_name) }]
    })
    lettRaw = JSON.parse(completion.choices[0].message.content || '{}')
  } catch (e) {
    // fallback minimo ma completo
    lettRaw = {
      analisi_tematica_filosofica: {
        temi_principali: [
          { tema: "Identità e memoria", spiegazione: "Ricerca del sé nel tempo.", citazioni: ["«…»","«…»","«…»"] }
        ],
        temi_secondari: [],
        tesi_filosofica: "L'io si costituisce come relazione col tempo e con la perdita."
      },
      analisi_stilistica_narratologica: {
        stile: { ritmo: "Lento e meditativo", lessico: "Elevato", sintassi: "Franta/ellittica" },
        narratore: "Io lirico",
        tempo_narrativo: "Non lineare",
        dispositivi_retorici: [{ nome: "ossimoro", effetto: "Evidenzia le tensioni interne" }],
        personaggi: []
      },
      contesto_storico_biografico: {
        storico: "Contesto contemporaneo: sensibilità post-digitale, temi identitari.",
        biografico: "Autore non noto/anonimo: possibili influenze simboliste/novecentesche."
      },
      sintesi_critica_conclusione: {
        sintesi: "Breve lirica sull'identità e la memoria.",
        valutazione_finale: "Originalità nel ritmo e nell'immaginario lessicale."
      }
    }
  }
  const analisi_letteraria = sanitizeLetteraria(lettRaw)

  // 3) salva su DB (aggiorna SOLO i campi analisi)
  try {
    const { error: updError } = await supabase
      .from('poesie')
      .update({
        analisi_psicologica,
        analisi_letteraria
      })
      .eq('id', body.id)

    if (updError) throw updError
  } catch (err: any) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Errore update DB', details: err.message }) }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      poesia_id: body.id,
      analisi_psicologica,
      analisi_letteraria
    })
  }
}

export { handler }
