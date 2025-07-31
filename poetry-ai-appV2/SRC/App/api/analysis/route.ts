
import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabase } from '@/lib/supabase'

export const runtime = 'edge'

interface AnalysisRequest {
  poemId: string
  content: string
}

export async function POST(req: Request) {
  try {
    const { poemId, content }: AnalysisRequest = await req.json()
    
    const openai = new OpenAI(process.env.OPENAI_API_KEY!)

    // 1. Analisi poetica
    const analysis = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{
        role: "user",
        content: `Analizza questa poesia in JSON con: tono (lirico/epico/drammatico), 
        temi (max 3), metriche (versi, schemaMetrico). Testo: ${content}`
      }],
      response_format: { type: "json_object" },
      max_tokens: 500
    })

    // 2. Genera embedding
    const embedding = await openai.embeddings.create({
      input: content,
      model: "text-embedding-3-small"
    })

    // 3. Salva nel database
    const { error } = await supabase
      .from('poems')
      .update({ 
        analysis: JSON.parse(analysis.choices[0].message.content || '{}'),
        embedding: embedding.data[0].embedding,
        is_analyzed: true
      })
      .eq('id', poemId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: "Failed to analyze poem" },
      { status: 500 }
    )
  }
}
