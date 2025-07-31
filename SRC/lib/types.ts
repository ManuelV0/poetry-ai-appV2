export interface PoemAnalysis {
  tono: 'lirico' | 'epico' | 'drammatico'
  temi: string[]
  metriche: {
    versi: number
    schemaMetrico: string
  }
}

export interface PoemBase {
  id: string
  text: string
  created_at: string
  updated_at: string
  user_id: string
  is_analyzed: boolean
}

export interface Poem extends PoemBase {
  analysis?: PoemAnalysis
  embedding?: number[]
  profiles?: {
    username: string | null
    avatar_url: string | null
  }
}

export interface PoemMatch extends Poem {
  similarity: number
  author_name?: string
  author_avatar?: string | null
}

export type ApiResponse<T> = {
  data?: T
  error?: string
  status?: number
}