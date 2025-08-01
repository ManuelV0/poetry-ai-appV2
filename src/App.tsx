import React, { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'

function PoesiaBox({ poesia }: { poesia: any }) {
  const [aperta, setAperta] = useState(false)

  return (
    <div className="w-full border rounded-lg p-6 shadow-lg mb-6 bg-white transition-all hover:shadow-xl font-sans">
      {/* Titolo e testo poesia */}
      <div
        className="cursor-pointer flex justify-between items-start"
        onClick={() => setAperta(v => !v)}
      >
        <div className="flex-1 pr-4">
          <h2 className="text-xl font-extrabold text-green-700 font-montserrat">{poesia.title || 'Senza titolo'}</h2>
          <p className="text-sm italic text-gray-500 mb-3 font-open-sans">{poesia.author_name || 'Anonimo'}</p>
          <p className={`text-gray-900 text-base leading-relaxed font-open-sans ${aperta ? '' : 'line-clamp-3'}`}>
            {poesia.content}
          </p>
        </div>
        <span className="text-green-600 font-semibold text-sm ml-4 select-none self-start mt-1 font-open-sans">
          {aperta ? '▲ Chiudi' : '▼ Apri'}
        </span>
      </div>

      {/* Analisi */}
      {aperta && (
        <div className="mt-8 space-y-6">
          <section className="bg-green-50 p-5 rounded shadow-inner border border-green-300 font-open-sans">
            <h3 className="font-bold text-green-800 mb-3 border-b border-green-400 pb-2 text-lg font-montserrat">
              Analisi Letteraria
            </h3>
            {poesia.analisi_letteraria ? (
              <>
                <p className="mb-1">
                  <strong>Stile letterario:</strong>{' '}
                  <span className="text-green-700">{poesia.analisi_letteraria.stile_letterario || 'N/A'}</span>
                </p>
                <p className="mb-1 font-semibold">Temi:</p>
                <ul className="list-disc list-inside ml-6 text-green-600 mb-3">
                  {(poesia.analisi_letteraria.temi || []).map((tema: string, i: number) => (
                    <li key={i}>{tema}</li>
                  ))}
                </ul>
                <p className="mb-1">
                  <strong>Struttura:</strong>{' '}
                  <span className="text-green-700">{poesia.analisi_letteraria.struttura || 'N/A'}</span>
                </p>
                <p>
                  <strong>Riferimenti culturali:</strong>{' '}
                  <span className="text-green-700">{poesia.analisi_letteraria.riferimenti_culturali || 'N/A'}</span>
                </p>
              </>
            ) : (
              <p className="italic text-green-400">Nessuna analisi letteraria disponibile.</p>
            )}
          </section>

          <section className="bg-indigo-50 p-5 rounded shadow-inner border border-indigo-300 font-open-sans">
            <h3 className="font-bold text-indigo-800 mb-3 border-b border-indigo-400 pb-2 text-lg font-montserrat">
              Analisi Psicologica
            </h3>
            {poesia.analisi_psicologica ? (
              <>
                <p className="mb-1 font-semibold">Emozioni:</p>
                <ul className="list-disc list-inside ml-6 text-indigo-600 mb-3">
                  {(poesia.analisi_psicologica.emozioni || []).map((emozione: string, i: number) => (
                    <li key={i}>{emozione}</li>
                  ))}
                </ul>
                <p className="mb-1">
                  <strong>Stato interno:</strong>{' '}
                  <span className="text-indigo-700">{poesia.analisi_psicologica.stato_interno || 'N/A'}</span>
                </p>
                <p>
                  <strong>Visione del mondo:</strong>{' '}
                  <span className="text-indigo-700">{poesia.analisi_psicologica.visione_del_mondo || 'N/A'}</span>
                </p>
              </>
            ) : (
              <p className="italic text-indigo-400">Nessuna analisi psicologica disponibile.</p>
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
    <main className="max-w-lg sm:max-w-3xl mx-auto p-6 bg-gray-50 min-h-screen font-open-sans">
      <h1 className="text-3xl font-extrabold mb-6 text-center text-green-700 tracking-wide font-montserrat">
        TheItalianPoetryProject.com
      </h1>

      <div className="mb-8">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cerca per titolo, autore o testo..."
          className="w-full p-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-4 focus:ring-green-500 focus:border-transparent text-gray-700 text-lg"
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
          <p className="text-center text-gray-400 mt-12 text-lg">Nessuna poesia trovata.</p>
        )
      )}
    </main>
  )
}
