import { NextResponse } from 'next/server'
import { supabase } from '@/lib/utils/supabase'

export const runtime = 'edge'

interface MatchRequest {
  poemId: string
}

export async function POST(req: Request) {
  const { poemId }: MatchRequest = await req.json()

  if (!poemId) {
    return NextResponse.json(
      { error: "poemId is required" },
      { status: 400 }
    )
  }

  try {
    const { data: matches, error } = await supabase.rpc('find_similar_poems', {
      target_id: poemId,
      similarity_threshold: 0.65,
      limit_results: 5
    })

    if (error) throw error

    return NextResponse.json(matches || [])

  } catch (error) {
    console.error('Matchmaking error:', error)
    return NextResponse.json(
      { error: "Failed to find matches" },
      { status: 500 }
    )
  }
}