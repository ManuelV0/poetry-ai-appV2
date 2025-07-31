import { notFound } from 'next/navigation'
import { PoemCard } from '@/components/poems/PoemCard'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { supabase } from '@/lib/utils/supabase'

interface PoemPageProps {
  params: { id: string }
}

export default async function PoemPage({ params }: PoemPageProps) {
  const { data: poem, error } = await supabase
    .from('poems')
    .select(`
      id,
      text,
      created_at,
      analysis,
      profiles:user_id (username, avatar_url)
    `)
    .eq('id', params.id)
    .single()

  if (error || !poem) return notFound()

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <PoemCard poem={poem} />
      
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