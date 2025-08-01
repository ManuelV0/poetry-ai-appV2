import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Metodo non consentito' }),
    }
  }

  const { title, content, user_id } = JSON.parse(event.body || '{}')

  if (!content || !title) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Titolo e contenuto sono richiesti' }),
    }
  }

  try {
    // Simulazione analisi (puoi sostituirla con GPT)
    const analisi_letteraria = {
      temi: ['ricchezza interiore', "illusione dell'identità", 'auto-riconoscimento'],
      tono: 'contemplativo e critico',
      stile: 'artistico e simbolico',
      figure_retoriche: ['metafora', 'paradosso', 'antitesi'],
      registro_linguistico: 'formale',
      riferimenti_culturali: 'filosofia esistenziale',
    }

    const analisi_psicologica = {
      emozioni: ['riflessione', 'ambivalenza'],
      profilo_poetico: 'filosofo esistenzialista',
      descrizione_breve:
        "La poesia esplora la dualità tra l'apparente ricchezza e la povertà dell'ego",
      visione_del_mondo:
        "Esplorazione delle illusioni dell'ego e del valore autentico",
      tratti_di_personalità: 'introspezione, consapevolezza critica',
    }

    const { data, error } = await supabase.from('poesie').insert([
      {
        title,
        content,
        analisi_letteraria,
        analisi_psicologica,
        user_id,
      },
    ])

    if (error) throw error

    return {
      statusCode: 200,
      body: JSON.stringify({ data }),
    }
  } catch (error: any) {
    console.error('Errore durante analisi o inserimento:', error.message)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    }
  }
}

export { handler }
