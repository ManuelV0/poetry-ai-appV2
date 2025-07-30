import { NextResponse } from 'next/server'
import { OpenAI } from 'openai'
import { supabase } from '@/lib/utils/supabase'

export const runtime = 'edge'

export async function POST(req: Request) {
  const { text, poemId } = await req.json()
  
  try {
    const openai = new OpenAI(process.env.OPENAI_API_KEY!)
    
    // Analisi strutturata
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [{
        role: "user",
        content: `Analizza questa poesia in JSON con: tono (solo lirico, epico o drammatico), 
        temi (array di 3 stringhe max), metriche (versi: numero, schemaMetrico: stringa). 
        Testo: ${text}`
      }],
      response_format: { type: "json_object" }
    })
    
    const analysis = JSON.parse(analysisResponse.choices[0].message.content || '{}')
    
    // Genera embedding
    const embeddingResponse = await openai.embeddings.create({
      input: text,
      model: "text-embedding-3-small"
    })
    const embedding = embeddingResponse.data[0].embedding
    
    // Salva nel database
    const { error } = await supabase
      .from('poems')
      .update({ 
        analysis,
        embedding,
        is_analyzed: true
      })
      .eq('id', poemId)
    
    if (error) {
      console.error('Supabase error:', error)
      throw new Error('Database update failed')
    }
    
    return NextResponse.json({ analysis, embedding })
    
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: "Errore nell'analisi della poesia" },
      { status: 500 }
    )
  }
}
