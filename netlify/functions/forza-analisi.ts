// netlify/functions/forza-analisi.ts
import 'dotenv/config';
import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// ===== ENV =====
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const LSTM_URL = process.env.LSTM_URL ?? 'http://localhost:5001/embedding';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ===== Utils =====
const isObj = (v: any) => v && typeof v === 'object' && !Array.isArray(v);
const arr = (v: any) => (Array.isArray(v) ? v.filter(Boolean) : []);
const s = (v: any) => (typeof v === 'string' && v.trim() ? v.trim() : '');

const toNameEvidenze = (item: any) =>
  typeof item === 'string'
    ? { nome: s(item), evidenze: [] as string[] }
    : { nome: s(item?.nome), evidenze: arr(item?.evidenze).map(s) };

const toCategoriaEsempi = (item: any) =>
  typeof item === 'string'
    ? { categoria: s(item), esempi: [] as string[] }
    : { categoria: s(item?.categoria), esempi: arr(item?.esempi).map(s) };

// ===== Sanitizer: Psicologica =====
function sanitizePsico(x: any) {
  return {
    fallacie_logiche: arr(x?.fallacie_logiche).map(toNameEvidenze),
    bias_cognitivi: arr(x?.bias_cognitivi).map(toNameEvidenze),
    meccanismi_di_difesa: arr(x?.meccanismi_di_difesa).map(toNameEvidenze),
    schemi_autosabotanti: arr(x?.schemi_autosabotanti).map(toNameEvidenze),
    pattern_emotivi: arr(x?.pattern_emotivi).map(toNameEvidenze),
    dinamiche_relazionali: arr(x?.dinamiche_relazionali).map(toNameEvidenze),
    lessico_emotivo: arr(x?.lessico_emotivo).map(toCategoriaEsempi),
  };
}

// ===== Sanitizer: Letteraria =====
function sanitizeLetteraria(x: any) {
  const temi = x?.analisi_tematica_filosofica || {};
  const stil = x?.analisi_stilistica_narratologica || {};
  const ctx = x?.contesto_storico_biografico || {};
  const sint = x?.sintesi_critica_conclusione;

  const stileField =
    typeof stil?.stile === 'string'
      ? stil.stile
      : isObj(stil?.stile)
      ? {
          ritmo: s(stil?.stile?.ritmo),
          lessico: s(stil?.stile?.lessico),
          sintassi: s(stil?.stile?.sintassi),
        }
      : { ritmo: '', lessico: '', sintassi: '' };

  return {
    analisi_tematica_filosofica: {
      temi_principali: Array.isArray(temi?.temi_principali)
        ? temi.temi_principali.map((t: any) => ({
            tema: s(t?.tema ?? (typeof t === 'string' ? t : '')),
            spiegazione: s(t?.spiegazione),
            citazioni: arr(t?.citazioni).map(s),
          }))
        : [],
      temi_secondari: Array.isArray(temi?.temi_secondari)
        ? temi.temi_secondari.map((t: any) => ({
            tema: s(t?.tema ?? (typeof t === 'string' ? t : '')),
            commento: s(t?.commento),
            citazioni: arr(t?.citazioni).map(s),
          }))
        : [],
      tesi_filosofica: s(temi?.tesi_filosofica),
    },
    analisi_stilistica_narratologica: {
      stile: stileField,
      narratore: s(stil?.narratore),
      tempo_narrativo: s(stil?.tempo_narrativo),
      dispositivi_retorici: Array.isArray(stil?.dispositivi_retorici)
        ? stil.dispositivi_retorici.map((d: any) => ({
            nome: s(d?.nome),
            effetto: s(d?.effetto),
          }))
        : [],
      personaggi: Array.isArray(stil?.personaggi)
        ? stil.personaggi.map((p: any) => ({
            nome: s(p?.nome),
            arco: s(p?.arco),
            motivazioni: s(p?.motivazioni),
            meccanismi_di_difesa: arr(p?.meccanismi_di_difesa).map(s),
          }))
        : [],
    },
    contesto_storico_biografico: { storico: s(ctx?.storico), biografico: s(ctx?.biografico) },
    sintesi_critica_conclusione:
      typeof sint === 'string'
        ? { sintesi: s(sint), valutazione_finale: '' }
        : isObj(sint)
        ? { sintesi: s(sint?.sintesi), valutazione_finale: s(sint?.valutazione_finale) }
        : { sintesi: '', valutazione_finale: '' },
  };
}

// ===== Prompts =====
const PROMPT_PSICO = (text: string) => `
Agisci come un analista brutalmente onesto ma accurato.
Restituisci SOLO JSON conforme allo schema:
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
"""${text}"""`.trim();

const PROMPT_LETTERARIO = (text: string, title?: string, author?: string) => `
Agisci come un critico letterario (strutturalismo+psicanalisi+contesto).
Rispondi SOLO con JSON conforme allo schema:
{
  "analisi_tematica_filosofica": {
    "temi_principali": [{"tema":"","spiegazione":"","citazioni":[""]}],
    "temi_secondari": [{"tema":"","commento":"","citazioni":[""]}],
    "tesi_filosofica": ""
  },
  "analisi_stilistica_narratologica": {
    "stile": {"ritmo":"","lessico":"","sintassi":""},
    "narratore": "",
    "tempo_narrativo": "",
    "dispositivi_retorici": [{"nome":"","effetto":""}],
    "personaggi": [{"nome":"","arco":"","motivazioni":"","meccanismi_di_difesa":[""]}]
  },
  "contesto_storico_biografico": {"storico":"","biografico":""},
  "sintesi_critica_conclusione": {"sintesi":"","valutazione_finale":""}
}
Titolo: ${title || 'Senza titolo'}
Autore: ${author || 'Anonimo'}
TESTO:
"""${text}"""`.trim();

// ===== Handler =====
export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  let body: { id?: string; content?: string; title?: string; author_name?: string } = {};
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON non valido' }) };
  }

  const { id, content, title, author_name } = body;
  if (!id || !content) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Campi obbligatori: id, content' }) };
  }

  // === 1) GPT: Psicologica + Letteraria (in parallelo) ===
  const [psicoRes, lettRes] = await Promise.allSettled([
    openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.3,
      messages: [{ role: 'user', content: PROMPT_PSICO(content) }],
    }),
    openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.35,
      messages: [{ role: 'user', content: PROMPT_LETTERARIO(content, title, author_name) }],
    }),
  ]);

  let analisi_psicologica: any = {
    fallacie_logiche: [],
    bias_cognitivi: [],
    meccanismi_di_difesa: [],
    schemi_autosabotanti: [],
    pattern_emotivi: [],
    dinamiche_relazionali: [],
    lessico_emotivo: [],
  };

  if (psicoRes.status === 'fulfilled') {
    try {
      const raw = JSON.parse(psicoRes.value.choices?.[0]?.message?.content || '{}');
      analisi_psicologica = sanitizePsico(raw);
    } catch {}
  }

  let analisi_letteraria: any = {
    analisi_tematica_filosofica: { temi_principali: [], temi_secondari: [], tesi_filosofica: '' },
    analisi_stilistica_narratologica: {
      stile: { ritmo: '', lessico: '', sintassi: '' },
      narratore: '',
      tempo_narrativo: '',
      dispositivi_retorici: [],
      personaggi: [],
    },
    contesto_storico_biografico: { storico: '', biografico: '' },
    sintesi_critica_conclusione: { sintesi: '', valutazione_finale: '' },
  };

  if (lettRes.status === 'fulfilled') {
    try {
      const raw = JSON.parse(lettRes.value.choices?.[0]?.message?.content || '{}');
      analisi_letteraria = sanitizeLetteraria(raw);
    } catch {}
  }

  // === 2) LSTM locale: embedding + features ===
  let poetic_embedding: number[] = [];
  let profilo_poetico: Record<string, any> = {};
  try {
    const r = await fetch(LSTM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: content }),
    });
    const j = await r.json();
    poetic_embedding = Array.isArray(j?.style_embedding) ? j.style_embedding : [];
    profilo_poetico = isObj(j?.style_features) ? j.style_features : {};
  } catch (e) {
    // se fallisce, lasciamo vuoto: non blocchiamo l’analisi
  }

  // === 3) Salva tutto su Supabase ===
  const { error } = await supabase
    .from('poesie')
    .update({ analisi_psicologica, analisi_letteraria, poetic_embedding, profilo_poetico })
    .eq('id', id);

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: 'DB update error', details: error.message }) };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ok: true,
      poesia_id: id,
      analisi_psicologica,
      analisi_letteraria,
      poetic_embedding_len: poetic_embedding.length,
      profilo_poetico_keys: Object.keys(profilo_poetico),
    }),
  };
};
