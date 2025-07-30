import { notFound } from 'next/navigation'
import { PoemCard } from '@/components/poems/PoemCard'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { supabase } from '@/lib/utils/supabase'

export default async function PoemPage({ params }: { params: { id: string } }) {
  const { data: poem, error } = await supabase
    .from('poems')
    .select(`
      id,
      text,
      created_at,
      analysis,
      profiles:user_id (id, username, avatar_url)
    `)
    .eq('id', params.id)
    .single()

  if (error || !poem) {
    return notFound()
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <PoemCard poem={poem} />
      
      <div className="mt-8 border-t pt-6">
        <h2 className="text-xl font-bold mb-4">Analisi Poetica</h2>
        
        {poem.analysis ? (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="mb-3">
              <span className="font-medium">Tono:</span>
              <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                {poem.analysis.tono}
              </span>
            </div>
            
            <div className="mb-3">
              <span className="font-medium">Temi principali:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {poem.analysis.temi.map((tema: string, i: number) => (
                  <span 
                    key={i}
                    className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm"
                  >
                    {tema}
                  </span>
                ))}
              </div>
            </div>
            
            <div>
              <span className="font-medium">Metrica:</span>
              <div className="mt-1">
                <p>Versi: {poem.analysis.metriche.versi}</p>
                <p>Schema metrico: {poem.analysis.metriche.schemaMetrico}</p>
              </div>
            </div>
          </div>
        ) : (
          <p>Analisi non ancora disponibile...</p>
        )}
      </div>
      
      <div className="mt-8 flex justify-end">
        <Link href={`/poems/${params.id}/matches`}>
          <Button variant="outline">
            Vedi poesie simili
          </Button>
        </Link>
      </div>
    </div>
  )
}
