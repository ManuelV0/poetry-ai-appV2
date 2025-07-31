import { NextResponse } from 'next/server'
import { supabase } from '@/lib/utils/supabase'

interface MatchRequest {
  poemId: string
  limit?: number
  threshold?: number
}

export async function POST(req: Request) {
  try {
    const { poemId, limit = 3, threshold = 0.7 }: MatchRequest = await req.json()

    const { data: matches, error } = await supabase.rpc('find_similar_poems', {
      target_id: poemId,
      similarity_threshold: threshold,
      limit_results: limit
    })

    if (error) throw error

    return NextResponse.json(matches)
  } catch (error) {
    console.error('Match error:', error)
    return NextResponse.json(
      { error: 'Failed to find matches' },
      { status: 500 }
    )
  }
}