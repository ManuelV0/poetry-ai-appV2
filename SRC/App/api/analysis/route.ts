import { NextResponse } from 'next/server'
import { OpenAI } from 'openai'
import { supabase } from '@/lib/utils/supabase'

interface AnalysisRequest {
  text: string
  poemId: string
}

interface PoemAnalysis {
  tono: string
  temi: string[]
  metriche: {
    versi: number
    schemaMetrico: string
  }
  figureRetoriche: string[]
}

export async function POST(req: Request) {
  try {
    const { text, poemId }: AnalysisRequest = await req.json()
    
    const openai = new OpenAI(process.env.OPENAI_API_KEY!)

    // 1. Analisi strutturata
    const analysis = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [{
        role: "user",
        content: `Analizza questa poesia in JSON con: tono (lirico/epico/drammatico), 
        temi (max 3), metriche (versi, schemaMetrico), figureRetoriche (max 2). Testo: ${text}`
      }],
      response_format: { type: "json_object" }
    })

    const analysisData: PoemAnalysis = JSON.parse(
      analysis.choices[0].message.content || '{}'
    )

    // 2. Genera embedding
    const embedding = await openai.embeddings.create({
      input: text,
      model: "text-embedding-3-small"
    })

    // 3. Salva nel DB
    const { error } = await supabase
      .from('poems')
      .update({ 
        analysis: analysisData,
        embedding: embedding.data[0].embedding,
        is_analyzed: true
      })
      .eq('id', poemId)

    if (error) throw error

    return NextResponse.json(analysisData)
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: 'Failed to analyze poem' },
      { status: 500 }
    )
  }
}