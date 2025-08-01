import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Metodo non consentito' }),
    }
  }

  try {
    // 1. Recupera tutte le poesie senza almeno un'analisi
    const { data: poesie, error } = await supabase
      .from('poesie')
      .select('id, title, content')
      .or('analisi_letteraria.is.null,analisi_psicologica.is.null')

    if (error) throw error

    let count = 0

    for (const poesia of poesie || []) {
      // 2. Genera analisi (MOCK: sostituisci con GPT quando vuoi)
      const analisi_letteraria = {
        temi: ['esempio tema'],
        tono: 'esempio tono',
        stile: 'esempio stile',
        figure_retoriche: ['esempio figura'],
        registro_linguistico: 'esempio registro',
        riferimenti_culturali: 'esempio riferimento',
      }
      const analisi_psicologica = {
        emozioni: ['esempio emozione'],
        profilo_poetico: 'esempio profilo',
        descrizione_breve: 'esempio descrizione',
        visione_del_mondo: 'esempio visione',
        tratti_di_personalità: 'esempio tratti',
      }

      // 3. Aggiorna la poesia esistente nel DB
      const { error: updError } = await supabase
        .from('poesie')
        .update({
          analisi_letteraria,
          analisi_psicologica,
        })
        .eq('id', poesia.id)

      if (!updError) count++
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Analizzate e aggiornate ${count} poesie.`,
      }),
    }
  } catch (error: any) {
    console.error('Errore durante analisi batch:', error.message)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    }
  }
}

export { handler }
