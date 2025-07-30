import { NextResponse } from 'next/server'
import { supabase } from '@/lib/utils/supabase'

export async function POST(req: Request) {
  const { poemId } = await req.json()
  
  try {
    const { data: matches, error } = await supabase.rpc('find_similar_poems', {
      target_id: poemId,
      similarity_threshold: 0.7,
      limit_results: 3
    })
    
    if (error) throw error
    
    return NextResponse.json(matches || [])
    
  } catch (error) {
    console.error('Matchmaking error:', error)
    return NextResponse.json(
      { error: "Errore nel trovare poesie simili" },
      { status: 500 }
    )
  }
}
