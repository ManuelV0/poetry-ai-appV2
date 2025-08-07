import React, { useEffect, useState, useRef } from 'react'
import { supabase } from './lib/supabaseClient'

// URL ASSOLUTO DELLA FUNCTION
const AUDIO_API_URL = 'https://poetry.theitalianpoetryproject.com/.netlify/functions/genera-audio'

function PoesiaBox({ poesia, audioState }) {
  const [aperta, setAperta] = useState(false)

  // Parse analisi se arriva come stringa
  let analisiL = poesia.analisi_letteraria
  let analisiP = poesia.analisi_psicologica
  try {
    if (typeof analisiL === 'string') analisiL = JSON.parse(analisiL)
    if (typeof analisiP === 'string') analisiP = JSON.parse(analisiP)
  } catch {}
  const tonoEmotivo = analisiP?.tono_emotivo || ''

  let stato = "Non generato"
  if (audioState === "generato") stato = "Audio generato"
  if (audioState === "in_corso") stato = "Generazione in corso..."

  return (
    <div className="w-full border rounded-lg p-6 shadow-lg mb-6 bg-white transition-all hover:shadow-xl font-sans">
      <div
        className="cursor-pointer flex justify-between items-start"
        onClick={() => setAperta(v => !v)}
      >
        <div className="flex-1 pr-4">
          <h2 className="text-xl font-extrabold text-green-700 font-montserrat">{poesia.title || 'Senza titolo'}</h2>
          <p className="text-sm italic text-gray-500 mb-2 font-open-sans">{poesia.author_name || 'Anonimo'}</p>
          {tonoEmotivo && (
            <span className="inline-block mb-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
              Tono: {tonoEmotivo}
            </span>
          )}
          <p className={`text-gray-900 text-base leading-relaxed font-open-sans ${aperta ? '' : 'line-clamp-3'}`}>
            {poesia.content}
          </p>
        </div>
        <span className="text-green-600 font-semibold text-sm ml-4 select-none self-start mt-1 font-open-sans">
          {aperta ? '▲ Chiudi' : '▼ Apri'}
        </span>
      </div>

      {/* Stato audio + player */}
      {aperta && (
        <div className="mt-6">
          <div className="mb-2 font-semibold text-sm text-green-800">{stato}</div>
          {audioState === "generato" && poesia.audio_url && (
            <audio controls className="my-2 w-full">
              <source src={poesia.audio_url} type="audio/mpeg" />
              Il tuo browser non supporta l'audio.
            </audio>
          )}
        </div>
      )}

      {/* Analisi */}
      {aperta && (
        <div className="mt-8 space-y-6">
          {/* Analisi Letteraria */}
          <section className="bg-green-50 p-5 rounded shadow-inner border border-green-300 font-open-sans">
            <h3 className="font-bold text-green-800 mb-3 border-b border-green-400 pb-2 text-lg font-montserrat">
              Analisi Letteraria
            </h3>
            {analisiL ? (
              <>
                <p className="mb-1">
                  <strong>Stile letterario:</strong>{' '}
                  <span className="text-green-700">{analisiL.stile_letterario || 'N/A'}</span>
                </p>
                <p className="mb-1 font-semibold">Temi:</p>
                <ul className="list-disc list-inside ml-6 text-green-600 mb-3">
                  {(analisiL.temi || []).map((tema, i) => (
                    <li key={i}>{tema}</li>
                  ))}
                </ul>
                <p className="mb-1">
                  <strong>Struttura:</strong>{' '}
                  <span className="text-green-700">{analisiL.struttura || 'N/A'}</span>
                </p>
                <p>
                  <strong>Riferimenti culturali:</strong>{' '}
                  <span className="text-green-700">{analisiL.riferimenti_culturali || 'N/A'}</span>
                </p>
              </>
            ) : (
              <p className="italic text-green-400">Nessuna analisi letteraria disponibile.</p>
            )}
          </section>

          {/* Analisi Psicologica */}
          <section className="bg-indigo-50 p-5 rounded shadow-inner border border-indigo-300 font-open-sans">
            <h3 className="font-bold text-indigo-800 mb-3 border-b border-indigo-400 pb-2 text-lg font-montserrat">
              Analisi Psicologica
            </h3>
            {analisiP ? (
              <>
                <p className="mb-1 font-semibold">Emozioni:</p>
                <ul className="list-disc list-inside ml-6 text-indigo-600 mb-3">
                  {(analisiP.emozioni || []).map((emozione, i) => (
                    <li key={i}>{emozione}</li>
                  ))}
                </ul>
                <p className="mb-1">
                  <strong>Stato interno:</strong>{' '}
                  <span className="text-indigo-700">{analisiP.stato_interno || 'N/A'}</span>
                </p>
                <p>
                  <strong>Visione del mondo:</strong>{' '}
                  <span className="text-indigo-700">{analisiP.visione_del_mondo || 'N/A'}</span>
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
  const [poesie, setPoesie] = useState([])
  const [audioStatus, setAudioStatus] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const lastGenRef = useRef(0)
  const genQueueRef = useRef([])

  // Carica poesie
  const fetchPoesie = async () => {
    const { data, error } = await supabase
      .from('poesie')
      .select('id, title, content, author_name, analisi_letteraria, analisi_psicologica, created_at, audio_url')
      .order('created_at', { ascending: false })

    if (!error) setPoesie(data || [])
    setLoading(false)
  }

  // Ciclo polling poesie
  useEffect(() => {
    fetchPoesie()
    const interval = setInterval(fetchPoesie, 15000)
    return () => clearInterval(interval)
  }, [])

  // Aggiorna stati audio ogni volta che cambiano le poesie
  useEffect(() => {
    let newStatus = {}
    poesie.forEach(p => {
      if (p.audio_url) newStatus[p.id] = "generato"
      else if (audioStatus[p.id] === "in_corso") newStatus[p.id] = "in_corso"
      else newStatus[p.id] = "non_generato"
    })
    setAudioStatus(newStatus)
    // eslint-disable-next-line
  }, [poesie])

  // Gestione coda generazione, UNA ogni 2 minuti
  useEffect(() => {
    const daGenerare = poesie.filter(p => !p.audio_url && audioStatus[p.id] !== "in_corso")
    if (daGenerare.length === 0) return

    genQueueRef.current = daGenerare.map(p => p.id)

    const tryGenerate = async () => {
      const now = Date.now()
      if (now - lastGenRef.current < 2 * 60 * 1000) return  // 2 minuti tra una generazione e l'altra
      const nextId = genQueueRef.current.shift()
      if (!nextId) return

      setAudioStatus(st => ({ ...st, [nextId]: "in_corso" }))
      lastGenRef.current = Date.now()
      const poesia = poesie.find(p => p.id === nextId)
      try {
        const res = await fetch(AUDIO_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY // <<< AGGIUNTO QUI
          },
          body: JSON.stringify({
            text: poesia.content,
            poesia_id: poesia.id
          })
        })
        const json = await res.json()
        if (json.audio_url) {
          await supabase
            .from('poesie')
            .update({ audio_url: json.audio_url, audio_generated: true })
            .eq('id', poesia.id)
          setAudioStatus(st => ({ ...st, [nextId]: "generato" }))
        } else {
          setAudioStatus(st => ({ ...st, [nextId]: "non_generato" }))
        }
      } catch (err) {
        setAudioStatus(st => ({ ...st, [nextId]: "non_generato" }))
      }
    }

    const interval = setInterval(tryGenerate, 5000) // check ogni 5 sec, parte solo 1 ogni 2 min!
    return () => clearInterval(interval)
    // eslint-disable-next-line
  }, [poesie, audioStatus])

  // Filtra poesie
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
      <div className="mb-8 poetry-search-bar">
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
      <div className="poesie-list" style={{maxHeight: "70vh", overflowY: "auto"}}>
        {poesieFiltrate.length > 0 ? (
          poesieFiltrate.map(poesia => (
            <PoesiaBox key={poesia.id} poesia={poesia} audioState={audioStatus[poesia.id] || "non_generato"} />
          ))
        ) : (
          !loading && (
            <p className="text-center text-gray-400 mt-12 text-lg">Nessuna poesia trovata.</p>
          )
        )}
      </div>
    </main>
  )
}
