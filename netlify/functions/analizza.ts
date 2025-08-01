import { Handler } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY! // Usa anon key o service role key se necessario
)

const handler: Handler = async (event) => {
  // 1. Verifica autenticazione
  const token = event.headers['authorization']?.split(' ')[1]
  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Token mancante' }),
    }
  }

  // 2. Ottieni utente
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Non autorizzato' }),
    }
  }

  // 3. Parsing e validazione
  let body;
  try {
    body = JSON.parse(event.body || '{}')
    if (!body.content) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Il contenuto è obbligatorio' }),
      }
    }
  } catch (e) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'JSON malformato' }),
    }
  }

  // 4. Prepara dati per l'inserimento
  const poemData = {
    title: body.title || null, // Permetti valori null
    content: body.content,
    author_name: body.author_name || null,
    profile_id: user.id, // Usa l'ID dell'utente autenticato
    instagram_handle: body.instagram_handle || null,
    analisi_letteraria: body.analisi_letteraria || generateMockAnalysis(body.content).letteraria,
    analisi_psicologica: body.analisi_psicologica || generateMockAnalysis(body.content).psicologica,
    match_id: body.match_id || null,
    created_at: new Date().toISOString()
  }

  // 5. Debug: log dei dati prima dell'inserimento
  console.log('Dati da inserire:', poemData)

  // 6. Inserimento
  try {
    const { data, error: insertError } = await supabase
      .from('poesie')
      .insert(poemData)
      .select() // Restituisce i dati inseriti

    if (insertError) {
      console.error('Errore Supabase:', insertError)
      throw insertError
    }

    return {
      statusCode: 201,
      body: JSON.stringify(data[0]),
    }
  } catch (error: any) {
    console.error('Errore durante l\'inserimento:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Errore del server',
        details: error.message 
      }),
    }
  }
}

// Helper per analisi mockata
function generateMockAnalysis(content: string) {
  return {
    letteraria: {
      temi: ['tema1', 'tema2'],
      tono: 'neutro',
      stile: 'moderno'
    },
    psicologica: {
      emozioni: ['emozione1'],
      tratti: ['introspettivo']
    }
  }
}

export { handler }
