import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
)

interface Poesia {
  id: number
  title: string
  content: string
  analisi_letteraria: any
  analisi_psicologica: any
}

export default function PoesieList({
  onSelect,
}: {
  onSelect: (poesia: Poesia) => void
}) {
  const [poesie, setPoesie] = useState<Poesia[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPoesie = async () => {
      const { data, error } = await supabase
        .from('poesie')
        .select('*')
        .not('analisi_letteraria', 'is', null)
        .not('analisi_psicologica', 'is', null)
        .order('created_at', { ascending: false })

      if (error) console.error(error)
      else setPoesie(data as Poesia[])

      setLoading(false)
    }

    fetchPoesie()
  }, [])

  if (loading) return <p>Caricamento poesie...</p>

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {poesie.map((poesia) => (
        <div
          key={poesia.id}
          onClick={() => onSelect(poesia)}
          className="border rounded p-4 shadow cursor-pointer hover:bg-gray-100"
        >
          <h2 className="text-lg font-bold">{poesia.title || 'Senza titolo'}</h2>
          <p className="line-clamp-3">{poesia.content}</p>
        </div>
      ))}
    </div>
  )
}
