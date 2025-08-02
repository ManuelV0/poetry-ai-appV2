import React, { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient' // Assicurati sia il path giusto!

// Un piccolo componente per ogni poesia (box espandibile)
function PoesiaBox({ poesia }: { poesia: any }) {
  const [aperta, setAperta] = useState(false)

  return (
    <div className="border rounded p-4 shadow mb-4 bg-white transition-all">
      <div
        className="cursor-pointer flex justify-between items-center"
        onClick={() => setAperta(v => !v)}
      >
        <div>
          <h2 className="text-lg font-bold">{poesia.title || 'Senza titolo'}</h2>
          <p className="text-sm text-gray-600">{poesia.author_name || 'Anonimo'}</p>
          <p className="line-clamp-2 text-gray-800">{poesia.content}</p>
        </div>
        <span className="text-blue-600 text-xs ml-4">
          {aperta ? '▲ Chiudi' : '▼ Apri'}
        </span>
      </div>
      {aperta && (
        <div className="mt-4">
          <h3 className="font-semibold mb-1">Analisi Letteraria</h3>
          <pre className="bg-gray-100 p-2 rounded text-xs whitespace-pre-wrap mb-2">
            {JSON.stringify(poesia.analisi_letteraria, null, 2)}
          </pre>
          <h3 className="font-semibold mb-1">Analisi Psicologica</h3>
          <pre className="bg-gray-100 p-2 rounded text-xs whitespace-pre-wrap">
            {JSON.stringify(poesia.analisi_psicologica, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [poesie, setPoesie] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPoesie = async () => {
      const { data, error } = await supabase
        .from('poesie')
        .select('id, title, content, author_name, analisi_letteraria, analisi_psicologica, created_at')
        .order('created_at', { ascending: false })
      if (!error) setPoesie(data || [])
      setLoading(false)
    }
    fetchPoesie()
  }, [])

  return (
    <main className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6 text-center">Vetrina delle poesie analizzate</h1>
      {loading && <p>Caricamento poesie...</p>}
      {poesie.map(poesia => (
        <PoesiaBox key={poesia.id} poesia={poesia} />
      ))}
      {(!loading && poesie.length === 0) && (
        <p className="text-center text-gray-500">Nessuna poesia trovata.</p>
      )}
    </main>
  )
}
