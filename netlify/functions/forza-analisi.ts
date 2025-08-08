// netlify/functions/forza-analisi.ts
import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// === Supabase + OpenAI ===
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })

// === Utils ===
const isNonEmptyObject = (v: any) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0
const arrOrEmpty = (v: any) => Array.isArray(v) ? v.filter(Boolean) : []
const strOrNA = (v: any) => (typeof v === 'string' && v.trim().length > 0) ? v.trim() : 'N/A'

// Sanitize PSICOLOGICA (accetta sia schema “dettagliato” sia “futurista” legacy)
function sanitizePsico(x: any) {
  const out: any = {}
  out.fallacie_logiche     = arrOrEmpty(x?.fallacie_logiche).map(strOrNA)
  out.bias_cognitivi       = arrOrEmpty(x?.bias_cognitivi).map(strOrNA)
  out.meccanismi_di_difesa = Array.isArray(x?.meccanismi_di_difesa)
    ? x.meccanismi_di_difesa.map((m: any) => ({
        nome: strOrNA(m?.nome),
        evidenze: arrOrEmpty(m?.evidenze).map(strOrNA)
      }))
    : []
  out.schemi_autosabotanti = arrOrEmpty(x?.schemi_autosabotanti).map(strOrNA)

  // compat: schema “futurista strategico”
  if (
    Array.isArray(x?.vettori_di_cambiamento_attuali) ||
    x?.scenario_ottimistico || x?.scenario_pessimistico ||
    isNonEmptyObject(x?.fattori_inattesi) || isNonEmptyObject(x?.dossier_strategico_oggi)
  ) {
    out.vettori_di_cambiamento_attuali = arrOrEmpty(x?.vettori_di_cambiamento_attuali).map(strOrNA)
    out.scenario_ottimistico = strOrNA(x?.scenario_ottimistico)
    out.scenario_pessimistico = strOrNA(x?.scenario_pessimistico)
    out.fattori_inattesi = {
      positivo_jolly: strOrNA(x?.fattori_inattesi?.positivo_jolly),
      negativo_cigno_nero: strOrNA(x?.fattori_inattesi?.negativo_cigno_nero)
    }
    out.dossier_strategico_oggi = {
      azioni_preparatorie_immediate: arrOrEmpty(x?.dossier_strategico_oggi?.azioni_preparatorie_immediate).map(strOrNA),
      opportunita_emergenti: arrOrEmpty(x?.dossier_strategico_oggi?.opportunita_emergenti).map(strOrNA),
      rischio_esistenziale_da_mitigare: strOrNA(x?.dossier_strategico_oggi?.rischio_esistenziale_da_mitigare)
    }
  }
  return out
}

// Sanitize LETTERARIA (accetta sia stringhe sia oggetti strutturati)
function sanitizeLetteraria(x: any) {
  const out: any = {}

  const temi = x?.analisi_tematica_filosofica || {}
  out.analisi_tematica_filosofica = {
    temi_principali: Array.isArray(temi?.temi_principali)
      ? temi.temi_principali.map((t: any) => ({
          tema: strOrNA(t?.tema),
          spiegazione: strOrNA(t?.spiegazione),
          citazioni: arrOrEmpty(t?.citazioni).map(strOrNA)
        }))
      : [],
    temi_secondari: Array.isArray(temi?.temi_secondari)
      ? temi.temi_secondari.map((t: any) => {
          if (typeof t === 'string') return t
          return {
            tema: strOrNA(t?.tema),
            commento: strOrNA(t?.commento),
            citazioni: arrOrEmpty(t?.citazioni).map(strOrNA)
          }
        })
      : [],
    tesi_filosofica: strOrNA(temi?.tesi_filosofica)
  }

  const stil = x?.analisi_stilistica_narratologica || {}

  let stileField: any = 'N/A'
  if (typeof stil?.stile === 'string') {
    stileField = stil.stile
  } else if (isNonEmptyObject(stil?.stile)) {
    stileField = {
      ritmo: strOrNA(stil?.stile?.ritmo),
      lessico: strOrNA(stil?.stile?.lessico),
      sintassi: strOrNA(stil?.stile?.sintassi)
    }
  }

  out.analisi_stilistica_narratologica = {
    stile: stileField,
    narratore: strOrNA(stil?.narratore),
    tempo_narrativo: strOrNA(stil?.tempo_narrativo),
    dispositivi_retorici: Array.isArray(stil?.dispositivi_retorici)
      ? stil.dispositivi_retorici.map((d: any) => ({
          nome: strOrNA(d?.nome),
          effetto: strOrNA(d?.effetto)
        }))
      : [],
    personaggi: Array.isArray(stil?.personaggi)
      ? stil.personaggi.map((p: any) => ({
          nome: strOrNA(p?.nome),
          arco: strOrNA(p?.arco),
          motivazioni: strOrNA(p?.motivazioni),
          meccanismi_di_difesa: arrOrEmpty(p?.meccanismi_di_difesa).map(strOrNA)
        }))
      : []
  }

  const ctx = x?.contesto_storico_biografico || {}
  out.contesto_storico_biografico = {
    storico: strOrNA(ctx?.storico),
    biografico: strOrNA(ctx?.biografico)
  }

  const sint = x?.sintesi_critica_conclusione
  out.sintesi_critica_conclusione =
    typeof sint === 'string'
      ? strOrNA(sint)
      : isNonEmptyObject(sint)
      ? {
          sintesi: strOrNA(sint?.sintesi),
          valutazione_finale: strOrNA(sint?.valutazione_finale)
        }
      : 'N/A'

  return out
}

// === PROMPTS SUPER-RIGIDI con few-shot ===
function buildPromptPsico(content: string) {
  return `
Agisci come un analista brutalmente onesto ma accurato.
Compito: sul TESTO (poesia) qui sotto, individua:
- fallacie_logiche: elenco di stringhe; minimo 1 voce. Se assenti, spiega brevemente perché (una riga).
- bias_cognitivi: elenco di stringhe; minimo 1 voce o spiegazione.
- meccanismi_di_difesa: elenco di oggetti {nome, evidenze[]} con 1–3 citazioni brevi dal testo per ciascuno.
- schemi_autosabotanti: elenco di stringhe; minimo 1 voce o spiegazione.

Regole:
- Sii diretto, NIENTE moralismi.
- Ogni affermazione deve avere un appiglio nel testo (usa virgolette «...» per citazioni; max 15 parole).
- Non inventare contenuti non presenti.
- Rispondi SOLO con JSON valido, esattamente nello schema seguente (tutti i campi obbligatori):

{
  "fallacie_logiche": ["..."],
  "bias_cognitivi": ["..."],
  "meccanismi_di_difesa": [
    { "nome": "...", "evidenze": ["...", "..."] }
  ],
  "schemi_autosabotanti": ["..."]
}

Esempio (few-shot, inventato):
INPUT: "Sono sempre un fallimento, non importa cosa faccia."
OUTPUT:
{
  "fallacie_logiche": ["generalizzazione indebita: 'sempre' indica estensione totale senza prove"],
  "bias_cognitivi": ["negativity bias: focalizzazione su insuccessi"],
  "meccanismi_di_difesa": [
    { "nome": "auto-svalutazione", "evidenze": ["«sempre un fallimento»"] }
  ],
  "schemi_autosabotanti": ["catastrofizzazione: anticipa il peggio senza base concreta"]
}

TESTO:
"""${content}"""
`.trim()
}

function buildPromptLetteraria(content: string, title?: string, author?: string) {
  return `
Agisci come un critico letterario accademico (strutturalismo + psicanalisi + contesto).
Obiettivo: produrre un’analisi profonda del testo in formato JSON RIGIDO.
Se autore ignoto o opera contemporanea: COMPILA comunque "contesto_storico_biografico" con:
- storico: "Contesto contemporaneo: ..." (es. ecosistemi digitali, liquefazione identitaria, ecc.)
- biografico: "Autore non noto/anonimo: ..." (ipotizza influenze stilistiche generali, senza spacciare fatti).

Schema OBBLIGATORIO (nessun campo vuoto: se non applicabile, spiega in breve):

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
- Lingua italiana.
- Ogni tema principale DEVE contenere 3 citazioni brevi (anche parafrasi fedeli) tratte dal testo («...»).
- Non inventare date/fatti. Se incerti: formula plausibile + disclaimer sintetico.
- Evita riassunti generici: entra nello specifico del testo dato.
- Mantieni chiarezza e densità argomentativa.

Few-shot minimo (esemplificativo):
INPUT (estratto): "Io non sono più quello di ieri; le parole mi difendono dalla memoria."
OUTPUT (solo un frammento del campo stile):
"analisi_stilistica_narratologica": {
  "stile": { "ritmo": "franto e meditativo", "lessico": "astratto-introspettivo", "sintassi": "ellittica con enjambement" },
  ...
}

Titolo: ${title || 'Senza titolo'}
Autore: ${author || 'Anonimo/Non noto'}

TESTO:
"""${content}"""
`.trim()
}

// === Handler ===
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

  // 1) Analisi PSICOLOGICA dettagliata
  let psicoRaw: any = {}
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.35,     // più preciso
      frequency_penalty: 0.2,
      messages: [{ role: 'user', content: buildPromptPsico(body.content) }]
    })
    psicoRaw = JSON.parse(completion.choices[0].message.content || '{}')
  } catch {
    psicoRaw = {
      fallacie_logiche: ["N/A: nessuna fallacia chiaramente deducibile dal frammento."],
      bias_cognitivi: ["N/A: bias non verificabili con certezza dal testo."],
      meccanismi_di_difesa: [{ nome: "razionalizzazione", evidenze: ["N/A"] }],
      schemi_autosabotanti: ["N/A"]
    }
  }
  const analisi_psicologica = sanitizePsico(psicoRaw)

  // 2) Analisi LETTERARIA robusta
  let lettRaw: any = {}
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      temperature: 0.45,     // più analitico
      frequency_penalty: 0.2,
      messages: [{ role: 'user', content: buildPromptLetteraria(body.content, body.title, body.author_name) }]
    })
    lettRaw = JSON.parse(completion.choices[0].message.content || '{}')
  } catch {
    lettRaw = {
      analisi_tematica_filosofica: {
        temi_principali: [
          { tema: "Identità e memoria", spiegazione: "Ricerca del sé nel tempo.", citazioni: ["«…»","«…»","«…»"] }
        ],
        temi_secondari: [],
        tesi_filosofica: "L'io come processo in dialogo con la mancanza."
      },
      analisi_stilistica_narratologica: {
        stile: { ritmo: "Lento/meditativo", lessico: "Astratto", sintassi: "Ellittica" },
        narratore: "Io lirico",
        tempo_narrativo: "Non lineare",
        dispositivi_retorici: [{ nome: "ossimoro", effetto: "Evidenzia tensioni interne" }],
        personaggi: []
      },
      contesto_storico_biografico: {
        storico: "Contesto contemporaneo: iper-testualità, frattura dell'io.",
        biografico: "Autore non noto/anonimo: possibili influenze simboliste/novecentesche."
      },
      sintesi_critica_conclusione: {
        sintesi: "Lirica sull'identità come frattura/continuità.",
        valutazione_finale: "Coerente densità stilistica."
      }
    }
  }
  const analisi_letteraria = sanitizeLetteraria(lettRaw)

  // 3) Salvataggio su DB
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
