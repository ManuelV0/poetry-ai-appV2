import 'dotenv/config';
import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export const handler: Handler = async (event) => {
  try {
    if (!event.body) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing request body' }) };
    }

    const { id, content, title, author_name } = JSON.parse(event.body);

    if (!id || !content) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing id or content' }) };
    }

    // ✅ Forza l'ID come stringa per Supabase
    const poemId = String(id);

    console.log('📌 Analisi forzata per poesia ID:', poemId);

    // PROMPT PSICOLOGICO COMPLETO
    const psychologicalPrompt = `
Agisci come un analista brutalmente onesto ma eccezionalmente acuto.

Compito: analizza il testo poetico che fornirò e individua TUTTE le occorrenze possibili delle seguenti categorie, citando SEMPRE evidenze testuali precise.

REGOLE:
- Sii diretto ma sempre fondato su frasi del testo.
- Se non trovi elementi in una categoria, restituisci array vuoto.
- L’output DEVE essere JSON valido secondo lo schema seguente.

SCHEMA JSON:
{
  "fallacie_logiche": [{"nome":"", "evidenze":["", ""]}],
  "bias_cognitivi": [{"nome":"", "evidenze":[""]}],
  "meccanismi_di_difesa": [{"nome":"", "evidenze":[""]}],
  "schemi_autosabotanti": [{"nome":"", "evidenze":[""]}],
  "pattern_emotivi": [{"nome":"", "evidenze":[""]}],
  "dinamiche_relazionali": [{"nome":"", "evidenze":[""]}],
  "lessico_emotivo": [{"categoria":"", "esempi":["",""]}]
}

TESTO DA ANALIZZARE:
<<<${content}>>>
    `;

    // PROMPT LETTERARIO COMPLETO
    const literaryPrompt = `
Agisci come un critico letterario accademico con esperienza in analisi strutturalista, critica psicanalitica e contestualizzazione storica.

REGOLE:
- Fornisci solo un JSON valido.
- Rispetta lo schema fornito sotto.
- Includi SEMPRE citazioni brevi (max 15 parole) per i temi principali.
- Se non hai dati per una sezione, restituisci campi vuoti.

SCHEMA JSON:
{
  "analisi_tematica_filosofica": {
    "temi_principali": [
      { "tema": "", "spiegazione": "", "citazioni": ["", ""] }
    ],
    "temi_secondari": [
      { "tema": "", "commento": "", "citazioni": [""] }
    ],
    "tesi_filosofica": ""
  },
  "analisi_stilistica_narratologica": {
    "stile": {
      "ritmo": "",
      "lessico": "",
      "sintassi": ""
    },
    "narratore": "",
    "tempo_narrativo": "",
    "dispositivi_retorici": [
      { "nome": "", "effetto": "" }
    ],
    "personaggi": [
      {
        "nome": "",
        "arco": "",
        "motivazioni": "",
        "meccanismi_di_difesa": ["", ""]
      }
    ]
  },
  "contesto_storico_biografico": {
    "storico": "",
    "biografico": ""
  },
  "sintesi_critica_conclusione": {
    "sintesi": "",
    "valutazione_finale": ""
  }
}

TESTO DA ANALIZZARE:
<<<${content}>>>
    `;

    // Chiamata a OpenAI - Analisi psicologica
    const psicologico = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: psychologicalPrompt }
      ]
    });

    // Chiamata a OpenAI - Analisi letteraria
    const letterario = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: literaryPrompt }
      ]
    });

    let analisiPsicologica = {};
    let analisiLetteraria = {};

    try {
      analisiPsicologica = JSON.parse(psicologico.choices[0].message.content || '{}');
    } catch {
      console.warn('⚠️ Analisi psicologica JSON non valido, uso oggetto vuoto');
    }

    try {
      analisiLetteraria = JSON.parse(letterario.choices[0].message.content || '{}');
    } catch {
      console.warn('⚠️ Analisi letteraria JSON non valido, uso oggetto vuoto');
    }

    // ✅ Update su Supabase con id come stringa
    const { error: dbError } = await supabase
      .from('poesie')
      .update({
        analisi_psicologica: analisiPsicologica,
        analisi_letteraria: analisiLetteraria
      })
      .eq('id', poemId);

    if (dbError) {
      console.error('❌ DB update error:', dbError);
      return { statusCode: 500, body: JSON.stringify({ error: 'DB update error', details: dbError.message }) };
    }

    console.log('✅ Analisi salvata per ID:', poemId);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, id: poemId })
    };

  } catch (error: any) {
    console.error('❌ Errore generale:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
