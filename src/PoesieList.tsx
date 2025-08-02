import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// 🔗 Supabase client (chiavi lato client)
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
)

// 📄 Tipo Poesia (aggiornato con voti)
interface Poesia {
  id: number
  title: string
  content: string
  analisi_letteraria: any
  analisi_psicologica: any
  author_name?: string
  created_at?: string
  media_voti?: number | null
  totale_voti?: number | null
}

// 📦 Componente PoesieList
export default function PoesieList({
  onSelect,
}: {
  onSelect: (poesia: Poesia) => void
}) {
  const [poesie, setPoesie] = useState<Poesia[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPoesie = async () => {
      // Ora usa la funzione RPC per avere anche i voti!
      const { data, error } = await supabase
        .rpc('get_poems_with_votes')

      if (error) {
        console.error('❌ Errore nel recupero poesie:', error)
      } else {
        setPoesie(data as Poesia[])
        console.log('✅ Poesie caricate:', data)
      }

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
          <p className="text-sm text-gray-600 mb-1">{poesia.author_name || 'Anonimo'}</p>
          <p className="text-xs text-gray-500 mb-2">{poesia.created_at?.split('T')[0]}</p>
          <p className="line-clamp-3">{poesia.content}</p>
          {/* Analisi Letteraria */}
          <div className="mt-2 text-xs">
            <strong>Letteraria:</strong>
            {poesia.analisi_letteraria && Object.keys(poesia.analisi_letteraria).length > 0 ? (
              <ul className="ml-4 list-disc">
                <li><strong>Stile:</strong> {poesia.analisi_letteraria.stile_letterario || 'N/A'}</li>
                <li>
                  <strong>Temi:</strong>
                  <ul className="ml-4 list-disc">
                    {(poesia.analisi_letteraria.temi || []).map((tema: string, i: number) => (
                      <li key={i}>{tema}</li>
                    ))}
                  </ul>
                </li>
                <li><strong>Struttura:</strong> {poesia.analisi_letteraria.struttura || 'N/A'}</li>
                <li><strong>Riferimenti culturali:</strong> {poesia.analisi_letteraria.riferimenti_culturali || 'N/A'}</li>
              </ul>
            ) : (
              <em>Non ancora analizzata</em>
            )}
          </div>
          {/* Analisi Psicologica */}
          <div className="mt-2 text-xs">
            <strong>Psicologica:</strong>
            {poesia.analisi_psicologica && Object.keys(poesia.analisi_psicologica).length > 0 ? (
              <ul className="ml-4 list-disc">
                <li>
                  <strong>Emozioni:</strong>
                  <ul className="ml-4 list-disc">
                    {(poesia.analisi_psicologica.emozioni || []).map((emo: string, i: number) => (
                      <li key={i}>{emo}</li>
                    ))}
                  </ul>
                </li>
                <li><strong>Stato interno:</strong> {poesia.analisi_psicologica.stato_interno || 'N/A'}</li>
                <li><strong>Visione del mondo:</strong> {poesia.analisi_psicologica.visione_del_mondo || 'N/A'}</li>
              </ul>
            ) : (
              <em>Non ancora analizzata</em>
            )}
          </div>
          {/* Media voto */}
          <div className="mt-2 text-xs text-gray-600">
            ⭐ Media voto: {poesia.media_voti !== null && poesia.media_voti !== undefined ? poesia.media_voti.toFixed(2) : '—'}
            <br />
            🗳️ Voti totali: {poesia.totale_voti || 0}
          </div>
        </div>
      ))}
    </div>
  )
}
