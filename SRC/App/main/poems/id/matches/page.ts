import { PoemMatchCard } from '@/components/poems/PoemMatchCard'
import { supabase } from '@/lib/utils/supabase'

export default async function PoemMatches({
  params
}: {
  params: { id: string }
}) {
  const { data: matches } = await supabase
    .rpc('find_similar_poems', {
      target_id: params.id
    })

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Poesie Simili</h1>
      
      {matches?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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