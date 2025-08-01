import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

// Configurazione migliorata
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY! // Usa una key meno privilegiata
)

const handler: Handler = async (event) => {
  // 1. Verifica JWT nell'header
  const token = event.headers['authorization']?.split(' ')[1]
  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Token mancante' }),
    }
  }

  // 2. Verifica utente autenticato
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Non autorizzato' }),
    }
  }

  // 3. Controllo metodo HTTP
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Metodo non consentito' }),
    }
  }

  // 4. Parsing e validazione
  let body;
  try {
    body = JSON.parse(event.body || '{}')
    if (!body.content || !body.title) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Titolo e contenuto sono richiesti' }),
      }
    }
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'JSON malformato' }),
    }
  }

  // 5. Controllo duplicati (opzionale)
  const { count } = await supabase
    .from('poesie')
    .select('*', { count: 'exact' })
    .eq('content', body.content)
    .eq('user_id', user.id)

  if (count && count > 0) {
    return {
      statusCode: 409,
      body: JSON.stringify({ error: 'Poesia già esistente' }),
    }
  }

  // 6. Analisi mockata (da sostituire con OpenAI quando necessario)
  const analisi = generateMockAnalysis(body.content)

  // 7. Inserimento sicuro
  try {
    const { data, error: insertError } = await supabase
      .from('poesie')
      .insert({
        title: body.title,
        content: body.content,
        ...analisi,
        user_id: user.id,
        created_at: new Date().toISOString()
      })
      .select()

    if (insertError) throw insertError

    return {
      statusCode: 201,
      body: JSON.stringify(data[0]),
    }
  } catch (error: any) {
    console.error('Errore database:', error.message)
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Errore interno del server' }),
    }
  }
}

// Funzione helper per analisi mockata
function generateMockAnalysis(content: string) {
  return {
    analisi_letteraria: {
      temi: ['ricchezza interiore', "illusione dell'identità"],
      tono: 'contemplativo',
      // ... altri campi
    },
    analisi_psicologica: {
      emozioni: ['riflessione'],
      // ... altri campi
    }
  }
}

export { handler }
