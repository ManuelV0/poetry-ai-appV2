import React, { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient' // Assicurati sia il path giusto!

function PoesiaBox({ poesia }: { poesia: any }) {
  const [aperta, setAperta] = useState(false)

  return (
    <div className="border rounded-lg p-4 shadow mb-5 bg-white transition-all">
      <div
        className="cursor-pointer flex justify-between items-center"
        onClick={() => setAperta(v => !v)}
      >
        <div className="flex-1 pr-3">
          <h2 className="text-base sm:text-lg font-semibold">{poesia.title || 'Senza titolo'}</h2>
          <p className="text-xs sm:text-sm text-gray-600">{poesia.author_name || 'Anonimo'}</p>
          <p className="line-clamp-2 text-gray-800 text-sm sm:text-base mt-1">{poesia.content}</p>
        </div>
        <span className="text-blue-600 text-xs sm:text-sm ml-2 select-none">
          {aperta ? '▲ Chiudi' : '▼ Apri'}
        </span>
      </div>

      {aperta && (
        <div className="mt-4 space-y-4 text-sm sm:text-base">
          <div>
            <h3 className="font-semibold mb-1">Analisi Letteraria</h3>
            {poesia.analisi_letteraria ? (
              <>
                <p><strong>Stile letterario:</strong> {poesia.analisi_letteraria.stile_letterario || 'N/A'}</p>
                <p><strong>Temi:</strong></p>
                <ul className="list-disc list-inside ml-5">
                  {(poesia.analisi_letteraria.temi || []).map((tema: string, i: number) => (
                    <li key={i}>{tema}</li>
                  ))}
                </ul>
                <p><strong>Struttura:</strong> {poesia.analisi_letteraria.struttura || 'N/A'}</p>
                <p><strong>Riferimenti culturali:</strong> {poesia.analisi_letteraria.riferimenti_culturali || 'N/A'}</p>
              </>
            ) : (
              <p className="italic text-gray-500">Nessuna analisi letteraria disponibile.</p>
            )}
          </div>

          <div>
            <h3 className="font-semibold mb-1">Analisi Psicologica</h3>
            {poesia.analisi_psicologica ? (
              <>
                <p><strong>Emozioni:</strong></p>
                <ul className="list-disc list-inside ml-5">
                  {(poesia.analisi_psicologica.emozioni || []).map((emozione: string, i: number) => (
                    <li key={i}>{emozione}</li>
                  ))}
                </ul>
                <p><strong>Stato interno:</strong> {poesia.analisi_psicologica.stato_interno || 'N/A'}</p>
                <p><strong>Visione del mondo:</strong> {poesia.analisi_psicologica.visione_del_mondo || 'N/A'}</p>
              </>
            ) : (
              <p className="italic text-gray-500">Nessuna analisi psicologica disponibile.</p>
            )}
          </div>
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
    <main className="max-w-lg sm:max-w-2xl mx-auto p-4 sm:p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-center text-green-700 tracking-wide">
        TheItalianPoetryProject.com
      </h1>

      {loading && <p className="text-center text-gray-500">Caricamento poesie...</p>}

      {poesie.map(poesia => (
        <PoesiaBox key={poesia.id} poesia={poesia} />
      ))}

      {!loading && poesie.length === 0 && (
        <p className="text-center text-gray-400 mt-10">Nessuna poesia trovata.</p>
      )}
    </main>
  )
}
