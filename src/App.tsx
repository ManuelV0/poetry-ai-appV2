import React, { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

function PoesiaBox({ poesia }: { poesia: any }) {
  const [aperta, setAperta] = useState(false)

  return (
    <div className="w-full border rounded-lg p-5 shadow mb-6 bg-white transition-all">
      {/* Titolo e testo poesia */}
      <div
        className="cursor-pointer flex justify-between items-start"
        onClick={() => setAperta(v => !v)}
      >
        <div className="flex-1 pr-4">
          <h2 className="text-lg font-extrabold text-indigo-700">{poesia.title || 'Senza titolo'}</h2>
          <p className="text-sm italic text-gray-500 mb-2">{poesia.author_name || 'Anonimo'}</p>
          <p className={`text-gray-900 text-base ${aperta ? '' : 'line-clamp-2'}`}>
            {poesia.content}
          </p>
        </div>
        <span className="text-indigo-600 font-semibold text-sm ml-3 select-none">
          {aperta ? '▲ Chiudi' : '▼ Apri'}
        </span>
      </div>

      {/* Analisi */}
      {aperta && (
        <div className="mt-6 space-y-6">
          <section className="bg-indigo-50 p-4 rounded shadow-inner border border-indigo-200">
            <h3 className="font-bold text-indigo-800 mb-2 border-b border-indigo-300 pb-1">Analisi Letteraria</h3>
            {poesia.analisi_letteraria ? (
              <>
                <p><strong>Stile letterario:</strong> <span className="text-indigo-700">{poesia.analisi_letteraria.stile_letterario || 'N/A'}</span></p>
                <p><strong>Temi:</strong></p>
                <ul className="list-disc list-inside ml-5 text-indigo-600">
                  {(poesia.analisi_letteraria.temi || []).map((tema: string, i: number) => (
                    <li key={i}>{tema}</li>
                  ))}
                </ul>
                <p><strong>Struttura:</strong> <span className="text-indigo-700">{poesia.analisi_letteraria.struttura || 'N/A'}</span></p>
                <p><strong>Riferimenti culturali:</strong> <span className="text-indigo-700">{poesia.analisi_letteraria.riferimenti_culturali || 'N/A'}</span></p>
              </>
            ) : (
              <p className="italic text-indigo-400">Nessuna analisi letteraria disponibile.</p>
            )}
          </section>

          <section className="bg-green-50 p-4 rounded shadow-inner border border-green-200">
            <h3 className="font-bold text-green-800 mb-2 border-b border-green-300 pb-1">Analisi Psicologica</h3>
            {poesia.analisi_psicologica ? (
              <>
                <p><strong>Emozioni:</strong></p>
                <ul className="list-disc list-inside ml-5 text-green-600">
                  {(poesia.analisi_psicologica.emozioni || []).map((emozione: string, i: number) => (
                    <li key={i}>{emozione}</li>
                  ))}
                </ul>
                <p><strong>Stato interno:</strong> <span className="text-green-700">{poesia.analisi_psicologica.stato_interno || 'N/A'}</span></p>
                <p><strong>Visione del mondo:</strong> <span className="text-green-700">{poesia.analisi_psicologica.visione_del_mondo || 'N/A'}</span></p>
              </>
            ) : (
              <p className="italic text-green-400">Nessuna analisi psicologica disponibile.</p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [poesie, setPoesie] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchPoesie = async () => {
    const { data, error } = await supabase
      .from('poesie')
      .select('id, title, content, author_name, analisi_letteraria, analisi_psicologica, created_at')
      .order('created_at', { ascending: false })

    if (!error) setPoesie(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchPoesie()

    const interval = setInterval(() => {
      fetchPoesie()
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  const poesieFiltrate = poesie.filter(p =>
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.author_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.content?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <main className="max-w-lg sm:max-w-2xl mx-auto p-4 sm:p-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-center text-green-700 tracking-wide mx-auto block">
        TheItalianPoetryProject.com
      </h1>

      <div className="mb-6">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cerca per titolo, autore o testo..."
          className="w-full p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-700"
          aria-label="Barra di ricerca poesie"
          autoComplete="off"
        />
      </div>

      {loading && <p className="text-center text-gray-500">Caricamento poesie...</p>}

      {poesieFiltrate.length > 0 ? (
        poesieFiltrate.map(poesia => (
          <PoesiaBox key={poesia.id} poesia={poesia} />
        ))
      ) : (
        !loading && (
          <p className="text-center text-gray-400 mt-10">Nessuna poesia trovata.</p>
        )
      )}
    </main>
  )
}
