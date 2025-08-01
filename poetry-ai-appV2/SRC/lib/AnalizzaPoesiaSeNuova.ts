import { supabase } from './supabaseClient';
import { openai } from './openai';

/**
 * Analizza una poesia con GPT solo se non già presente nel database.
 * Salva analisi_letteraria e analisi_psicologica come JSONB nella tabella poesie.
 */
export async function analizzaPoesiaSeNuova(poesia: string, autore: string) {
  try {
    // 1. Controlla se la poesia esiste già nel database
    const { data: esistente, error: checkError } = await supabase
      .from('poesie')
      .select('id')
      .eq('content', poesia)
      .maybeSingle();

    if (checkError) throw checkError;

    if (esistente) {
      return {
        status: 'già analizzata',
        poesia_id: esistente.id
      };
    }

    // 2. Prompt per GPT
    const prompt = `
Agisci come critico letterario e psicologo. Analizza la poesia seguente nei seguenti due blocchi:

1. Analisi Letteraria:
- Stile
- Temi
- Struttura
- Eventuali riferimenti culturali

2. Analisi Psicologica:
- Emozioni
- Stato interiore del poeta
- Visione del mondo

Rispondi in JSON come segue:

{
  "analisi_letteraria": {
    "stile_letterario": "...",
    "temi": ["...", "..."],
    "struttura": "...",
    "riferimenti_culturali": "..."
  },
  "analisi_psicologica": {
    "emozioni": ["...", "..."],
    "stato_interno": "...",
    "visione_del_mondo": "..."
  }
}

POESIA:
${poesia}
`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.8
    });

    const analisi = JSON.parse(completion.choices[0].message.content || '{}');

    // 3. Inserisci nuova poesia con l'analisi
    const { data: nuovaPoesia, error: insertError } = await supabase
      .from('poesie')
      .insert([{
        content: poesia,
        author_name: autore,
        analisi_letteraria: analisi.analisi_letteraria,
        analisi_psicologica: analisi.analisi_psicologica
      }])
      .select()
      .single();

    if (insertError) throw insertError;

    return {
      status: 'analizzata',
      poesia_id: nuovaPoesia.id,
      analisi
    };
  } catch (err) {
    console.error('Errore durante analisi:', err);
    return {
      status: 'errore',
      error: err
    };
  }
}