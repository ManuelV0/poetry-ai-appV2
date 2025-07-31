import { NextResponse } from 'next/server'
import { OpenAI } from 'openai'
import { supabase } from '@/lib/utils/supabase'

export const runtime = 'edge'

interface AnalysisRequest {
  text: string
  poemId: string
}

interface PoemAnalysis {
  tono: 'lirico' | 'epico' | 'drammatico'
  temi: string[]
  metriche: {
    versi: number
    schemaMetrico: string
  }
}

export async function POST(req: Request) {
  const { text, poemId }: AnalysisRequest = await req.json()

  if (!text || !poemId) {
    return NextResponse.json(
      { error: "Text and poemId are required" },
      { status: 400 }
    )
  }

  try {
    const openai = new OpenAI(process.env.OPENAI_API_KEY!)

    // 1. Analisi poetica
    const analysisResponse = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [{
        role: "user",
        content: `Analizza questa poesia in JSON con: tono (solo: lirico/epico/drammatico), 
        temi (array di max 3 stringhe), metriche (versi: numero, schemaMetrico: stringa).
        Testo: ${text}`
      }],
      response_format: { type: "json_object" },
      temperature: 0.7
    })

    const analysis: PoemAnalysis = JSON.parse(
      analysisResponse.choices[0].message.content || '{}'
    )

    // 2. Genera embedding
    const embeddingResponse = await openai.embeddings.create({
      input: text,
      model: "text-embedding-3-small"
    })

    // 3. Salva nel DB
    const { error } = await supabase
      .from('poems')
      .update({
        analysis,
        embedding: embeddingResponse.data[0].embedding,
        is_analyzed: true
      })
      .eq('id', poemId)

    if (error) throw error

    return NextResponse.json(analysis)

  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}