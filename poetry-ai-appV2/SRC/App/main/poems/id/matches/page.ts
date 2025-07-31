import { notFound } from 'next/navigation'
import { PoemMatchCard } from '@/components/poems/PoemMatchCard'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { supabase } from '@/lib/utils/supabase'

interface MatchPageProps {
  params: { id: string }
}

export default async function PoemMatchesPage({ params }: MatchPageProps) {
  // Verifica esistenza poesia
  const { data: poem } = await supabase
    .from('poems')
    .select('id, text')
    .eq('id', params.id)
    .single()

  if (!poem) return notFound()

  // Recupera match
  const matchRes = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/poems/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ poemId: params.id }),
    next: { revalidate: 3600 } // Cache 1 ora
  })

  if (!matchRes.ok) {
    throw new Error('Failed to fetch matches')
  }

  const matches = await matchRes.json()

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">
          Poesie simili a: <span className="text-blue-600">"{poem.text.substring(0, 30)}..."</span>
        </h1>
        <Link href={`/poems/${params.id}`}>
          <Button variant="outline">Torna alla poesia</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {matches.length > 0 ? (
          matches.map((match: any) => (
            <PoemMatchCard key={match.id} poem={match} />
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 mb-4">Nessuna poesia simile trovata</p>
            <Link href="/poems/new">
              <Button>Crea una nuova poesia</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}