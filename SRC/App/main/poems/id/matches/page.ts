import { notFound } from 'next/navigation'
import { PoemMatchCard } from '@/components/poems/PoemMatchCard'
import { supabase } from '@/lib/utils/supabase'

export default async function PoemMatchesPage({ params }: { params: { id: string } }) {
  // Recupera poesia principale
  const { data: mainPoem } = await supabase
    .from('poems')
    .select('id, text')
    .eq('id', params.id)
    .single()

  if (!mainPoem) return notFound()

  // Recupera match
  const matchResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/poems/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ poemId: params.id }),
    cache: 'no-store'
  })
  
  const matches = await matchResponse.json()

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-2">Poesie Simili</h1>
      <p className="text-gray-600 mb-6">Abbinamenti trovati per la tua poesia</p>
      
      <div className="mb-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-medium mb-2">La tua poesia:</h3>
        <p className="italic line-clamp-3">{mainPoem.text}</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {matches.length > 0 ? (
          matches.map((poem: any) => (
            <PoemMatchCard key={poem.id} poem={poem} />
          ))
        ) : (
          <p>Nessuna poesia simile trovata</p>
        )}
      </div>
    </div>
  )
}
