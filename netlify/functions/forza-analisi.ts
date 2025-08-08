import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

// --- ENV --------------------------------------------------------------------
const SUPABASE_URL = process.env.SUPABASE_URL!
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY! // SERVER SIDE
const OPENAI_KEY = process.env.OPENAI_API_KEY!

// --- Supabase & OpenAI ------------------------------------------------------
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: 'public' }
})
const openai = new OpenAI({ apiKey: OPENAI_KEY })

// --- CORS -------------------------------------------------------------------
const ALLOWED_ORIGINS = [
  'https://theitalianpoetryproject.com',
  'https://poetry.theitalianpoetryproject.com',
  'https://widget.theitalianpoetryproject.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173'
]

// =================================================================================

const handler: Handler = async (event) => {
  const origin = event.headers.origin || ''
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  const CORS = {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' }
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS, body: JSON.stringify({ error: 'Usa POST' }) }
  }

  // Parse body
  let body: {
    id?: string
    content?: string
    title?: string
    author?: string
    focus?: string
  }
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'JSON non valido' }) }
  }

  const poemId = body.id
  const content = (body.content || '').trim()
  const title = (body.title || '').trim()
  const author = (body.author || '').trim()
  const focus = (body.focus || '').trim()

  if (!poemId || !content) {
    return { statusCode: 400, headers: CORS, body: JSON.stringify({ error: 'Campi obbligatori: id, content' }) }
  }

  // Prompt combinato (analisi letteraria accademica + analisi psicologica “brutale”)
  const titoloAutore = title && author
    ? `"${title}" di ${author}`
    : (title ? `"${title}"` : (author ? `Testo di ${author}` : 'Testo'))

  const focusLine = focus
    ? `Se l'opera è lunga, concentrati su: ${focus}.`
    : 'Se l\'opera è lunga, concentrati su un personaggio, capitolo o tema centrale più rilevante.'

  const prompt = `
DEVI RISPONDERE **SOLO** CON UN JSON VALIDO avente questa struttura:

{
  "analisi_letteraria": {
    "analisi_tematica_filosofica": {
      "temi_principali": [
        {
          "tema": "...",
          "citazioni": ["...", "...", "..."],
          "commento": "..."
        }
      ],
      "temi_secondari": [
        {
          "tema": "...",
          "citazioni": ["..."],
          "commento": "..."
        }
      ],
      "tesi_filosofica": "Sintesi della visione del mondo/tesi dell'autore con riferimenti testuali"
    },
    "analisi_personaggi_psicologica": {
      "protagonista": {
        "nome": "se noto o 'io lirico'",
        "arco": "evoluzione/assenza",
        "motivazioni_conflitti": "conflitti interni, desideri consci/inconsci",
        "meccanismi_difesa": ["...", "..."],
        "note": "come spinge i temi"
      },
      "secondario_significativo": {
        "nome": "se presente",
        "arco": "…",
        "motivazioni_conflitti": "…",
        "meccanismi_difesa": ["..."],
        "note": "interazione col protagonista"
      }
    },
    "analisi_stilistica_narratologica": {
      "stile": { "lessico": "...", "sintassi": "...", "ritmo": "..." },
      "narratore": "prima/terza, onnisciente, inaffidabile…",
      "tempo_narrativo": "linearità/flashback/prolessi…",
      "dispositivi_retorici": [
        { "tipo": "metafora/ironia/monologo interiore…", "effetto": "..." },
        { "tipo": "...", "effetto": "..." },
        { "tipo": "...", "effetto": "..." }
      ]
    },
    "contesto_storico_biografico": {
      "contesto": "inquadramento storico-culturale",
      "riflessi_nel_testo": "come il contesto entra nell'opera",
      "tracce_biografiche_pertinenti": "collegamenti non riduzionisti"
    },
    "sintesi_critica_conclusione": {
      "sintesi": "come stile, personaggi e contesto producono il significato complessivo",
      "valutazione_finale": "originalità e rilevanza nel canone"
    }
  },
  "analisi_psicologica": {
    "fallacie_logiche": [
      { "nome": "...", "evidenze": ["citazione/e dal testo"] }
    ],
    "bias_cognitivi": [
      { "nome": "...", "evidenze": ["citazione/e dal testo"] }
    ],
    "meccanismi_di_difesa": [
      { "nome": "razionalizzazione/proiezione/…", "evidenze": ["citazione/e"] }
    ],
    "schemi_autosabotanti": [
      { "nome": "...", "evidenze": ["citazione/e"] }
    ],
    "nota_metodologica": "come hai inferito le categorie solo da materiale testuale"
  }
}

REGOLE:
- NIENTE testo fuori dal JSON.
- Le CITAZIONI devono provenire dal testo dato (brevi estratti).
- Se una sezione non è applicabile, restituisci array vuoti/campi stringa vuoti, NON inventare.

CONTESTO DI LAVORO (per la parte letteraria):
Agisci come un critico letterario accademico con esperienza in analisi strutturalista, critica psicanalitica e contestualizzazione storica. Il tuo obiettivo è produrre un'analisi approfondita e multi-livello del seguente testo: ${titoloAutore}. ${focusLine}

TESTO DA ANALIZZARE:
${content}
`.trim()

  // Chiamata OpenAI
  let result: any
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4
    })
    const raw = completion.choices?.[0]?.message?.content || '{}'
    result = JSON.parse(raw)
  } catch (err) {
    console.error('OpenAI error:', err)
    result = {
      analisi_letteraria: {
        analisi_tematica_filosofica: {
          temi_principali: [],
          temi_secondari: [],
          tesi_filosofica: ""
        },
        analisi_personaggi_psicologica: {
          protagonista: { nome: "", arco: "", motivazioni_conflitti: "", meccanismi_difesa: [], note: "" },
          secondario_significativo: { nome: "", arco: "", motivazioni_conflitti: "", meccanismi_difesa: [], note: "" }
        },
        analisi_stilistica_narratologica: {
          stile: { lessico: "", sintassi: "", ritmo: "" },
          narratore: "",
          tempo_narrativo: "",
          dispositivi_retorici: []
        },
        contesto_storico_biografico: {
          contesto: "",
          riflessi_nel_testo: "",
          tracce_biografiche_pertinenti: ""
        },
        sintesi_critica_conclusione: {
          sintesi: "",
          valutazione_finale: ""
        }
      },
      analisi_psicologica: {
        fallacie_logiche: [],
        bias_cognitivi: [],
        meccanismi_di_difesa: [],
        schemi_autosabotanti: [],
        nota_metodologica: "Fallback per indisponibilità del modello."
      }
    }
  }

  const analisi_letteraria = result?.analisi_letteraria ?? null
  const analisi_psicologica = result?.analisi_psicologica ?? null

  // Update DB
  const { error: updErr } = await supabase
    .from('poesie')
    .update({ analisi_letteraria, analisi_psicologica })
    .eq('id', poemId)

  if (updErr) {
    console.error('Supabase update error:', updErr)
    return { statusCode: 500, headers: CORS, body: JSON.stringify({ error: updErr.message }) }
  }

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({
      ok: true,
      message: 'Analisi letteraria (5 sezioni) + psicologica salvate',
      analisi_salvata: {
        has_letteraria: !!analisi_letteraria,
        has_psicologica: !!analisi_psicologica
      }
    })
  }
}

export { handler }
