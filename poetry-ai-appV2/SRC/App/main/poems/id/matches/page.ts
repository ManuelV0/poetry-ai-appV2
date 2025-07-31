import { PoemMatchCard } from '@/components/poems/PoemMatchCard'
import { supabase } from '@/lib/supabase'

interface PoemMatch {
  id: string
  title: string
  content: string
  similarity: number
  username: string
}

export default async function PoemMatches({
  params
}: {
  params: { id: string }
}) {
  const { data: matches, error } = await supabase
    .rpc('find_similar_poems', { target_id: params.id })
    .returns<PoemMatch[]>()

  if (error) {
    console.error('Match error:', error)
    return <div>Error loading matches</div>
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Poesie Simili</h1>
      {matches?.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {matches.map((poem) => (
            <PoemMatchCard key={poem.id} poem={poem} />
          ))}
        </div>
      ) : (
        <p>Nessuna poesia simile trovata</p>
      )}
    </div>
  )
}
