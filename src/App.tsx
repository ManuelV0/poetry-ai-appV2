
// src/App.tsx

import React, { useEffect, useState, useRef } from 'react'
import { supabase } from './lib/supabaseClient'

// ENDPOINTS
const AUDIO_API_URL = 'https://poetry.theitalianpoetryproject.com/.netlify/functions/genera-audio'
const POESIE_API_URL = '/.netlify/functions/poesie'
const ANALISI_API_URL = '/.netlify/functions/forza-analisi'

function PoesiaBox({ poesia, audioState }) {
  const [aperta, setAperta] = useState(false)
  const [analisi, setAnalisi] = useState(() => {
    try {
      const raw = poesia.analisi_psicologica
      if (!raw) return null
      const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
      return obj && typeof obj === 'object' && Object.keys(obj).length > 0 ? obj : null
    } catch {
      return null
    }
  })

  const [analisiStatus, setAnalisiStatus] = useState<'idle'|'loading'|'success'|'error'>(analisi ? 'success' : 'idle')
  const [analisiError, setAnalisiError] = useState<string | null>(null)
  const generazioneInCorsoRef = useRef(false)

  let statoAudio = 'Non generato'
  if (audioState === 'generato') statoAudio = 'Audio generato'
  if (audioState === 'in_corso') statoAudio = 'Generazione in corso...'

  useEffect(() => {
    const mancaAnalisi = !analisi || Object.keys(analisi || {}).length === 0
    if (!aperta || !mancaAnalisi || generazioneInCorsoRef.current) return

    const genera = async () => {
      generazioneInCorsoRef.current = true
      setAnalisiStatus('loading')
      setAnalisiError(null)
      try {
        const res = await fetch(ANALISI_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: poesia.id, content: poesia.content })
        })

        if (!res.ok) {
          const t = await res.text().catch(() => '')
          throw new Error(t || `HTTP ${res.status}`)
        }

        const { data, error } = await supabase
          .from('poesie')
          .select('analisi_psicologica')
          .eq('id', poesia.id)
          .single()

        if (error) throw error

        let nuovaAnalisi = data?.analisi_psicologica ?? null
        try {
          if (typeof nuovaAnalisi === 'string') nuovaAnalisi = JSON.parse(nuovaAnalisi)
        } catch {}

        if (!nuovaAnalisi || typeof nuovaAnalisi !== 'object' || Object.keys(nuovaAnalisi).length === 0) {
          throw new Error('Analisi vuota o non valida')
        }

        setAnalisi(nuovaAnalisi)
        setAnalisiStatus('success')
      } catch (err) {
        setAnalisiStatus('error')
        setAnalisiError('Impossibile generare l’analisi ora. Riprova più tardi.')
      } finally {
        generazioneInCorsoRef.current = false
      }
    }

    genera()
  }, [aperta, analisi, poesia.id, poesia.content])

  return (
    <div className="w-full border rounded-lg p-6 shadow-lg mb-6 bg-white transition-all hover:shadow-xl font-sans">
      <div
        className="cursor-pointer flex justify-between items-start"
        onClick={() => setAperta(v => !v)}
        role="button"
        aria-expanded={aperta}
      >
        <div className="flex-1 pr-4">
          <h2 className="text-xl font-extrabold text-green-700 font-montserrat">{poesia.title || 'Senza titolo'}</h2>
          <p className="text-sm italic text-gray-500 mb-2 font-open-sans">{poesia.author_name || 'Anonimo'}</p>
          <p className={`text-gray-900 text-base leading-relaxed font-open-sans ${aperta ? '' : 'line-clamp-3'}`}>
            {poesia.content}
          </p>
        </div>
        <span className="text-green-600 font-semibold text-sm ml-4 select-none self-start mt-1 font-open-sans">
          {aperta ? '▲ Chiudi' : '▼ Apri'}
        </span>
      </div>

      {/* AUDIO */}
      {aperta && (
        <div className="mt-6">
          <div className="mb-2 font-semibold text-sm text-green-800">{statoAudio}</div>
          {audioState === 'generato' && poesia.audio_url && (
            <audio controls className="my-2 w-full">
              <source src={poesia.audio_url} type="audio/mpeg" />
              Il tuo browser non supporta l'audio.
            </audio>
          )}
        </div>
      )}

      {/* ANALISI */}
      {aperta && (
        <div className="mt-8 space-y-6 font-open-sans">
          {analisiStatus === 'loading' && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2">
              Generazione analisi in corso…
            </div>
          )}
          {analisiStatus === 'error' && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              {analisiError}
            </div>
          )}
          {analisi && analisiStatus === 'success' && (
            <>
              <section className="bg-green-50 p-5 rounded shadow-inner border border-green-300">
                <h3 className="font-bold text-green-800 mb-3 border-b border-green-400 pb-2 text-lg font-montserrat">Vettori di Cambiamento Attuali</h3>
                <ul className="list-disc list-inside ml-6 text-green-700">
                  {(analisi.vettori_di_cambiamento_attuali || []).map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              </section>
              <section className="bg-blue-50 p-5 rounded shadow-inner border border-blue-300">
                <h3 className="font-bold text-blue-800 mb-3 border-b border-blue-400 pb-2 text-lg font-montserrat">Scenario Ottimistico</h3>
                <p className="text-blue-700">{analisi.scenario_ottimistico || 'N/A'}</p>
              </section>
              <section className="bg-red-50 p-5 rounded shadow-inner border border-red-300">
                <h3 className="font-bold text-red-800 mb-3 border-b border-red-400 pb-2 text-lg font-montserrat">Scenario Pessimistico</h3>
                <p className="text-red-700">{analisi.scenario_pessimistico || 'N/A'}</p>
              </section>
              <section className="bg-yellow-50 p-5 rounded shadow-inner border border-yellow-300">
                <h3 className="font-bold text-yellow-800 mb-3 border-b border-yellow-400 pb-2 text-lg font-montserrat">Fattori Inattesi</h3>
                <p><strong>Positivo (Jolly):</strong> {analisi.fattori_inattesi?.positivo_jolly || 'N/A'}</p>
                <p><strong>Negativo (Cigno Nero):</strong> {analisi.fattori_inattesi?.negativo_cigno_nero || 'N/A'}</p>
              </section>
              <section className="bg-indigo-50 p-5 rounded shadow-inner border border-indigo-300">
                <h3 className="font-bold text-indigo-800 mb-3 border-b border-indigo-400 pb-2 text-lg font-montserrat">Dossier Strategico per Oggi</h3>
                <p className="font-semibold">Azioni Preparatorie Immediate:</p>
                <ul className="list-disc list-inside ml-6 text-indigo-700 mb-3">
                  {(analisi.dossier_strategico_oggi?.azioni_preparatorie_immediate || []).map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
                <p className="font-semibold">Opportunità Emergenti:</p>
                <ul className="list-disc list-inside ml-6 text-indigo-700 mb-3">
                  {(analisi.dossier_strategico_oggi?.opportunita_emergenti || []).map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
                <p><strong>Rischio Esistenziale da Mitigare:</strong> {analisi.dossier_strategico_oggi?.rischio_esistenziale_da_mitigare || 'N/A'}</p>
              </section>
            </>
          )}
          {!analisi && analisiStatus === 'idle' && (
            <div className="text-gray-500 italic text-sm">Analisi non disponibile per questa poesia.</div>
          )}
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

  const fetchPoesie = async () => {
    try {
      const res = await fetch(POESIE_API_URL, { cache: 'no-store' })
      const data = await res.json()
      setPoesie(Array.isArray(data) ? data : [])
    } catch {
      setPoesie([])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchPoesie()
    const interval = setInterval(fetchPoesie, 15000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const next = {}
    for (const p of poesie) {
      if (p.audio_url) next[p.id] = 'generato'
      else if (audioStatus[p.id] === 'in_corso') next[p.id] = 'in_corso'
      else next[p.id] = 'non_generato'
    }
    setAudioStatus(next)
  }, [poesie])

  useEffect(() => {
    const daGenerare = poesie.filter(p => !p.audio_url && audioStatus[p.id] !== 'in_corso')
    if (daGenerare.length === 0) return

    genQueueRef.current = daGenerare.map(p => p.id)

    const tryGenerate = async () => {
      const now = Date.now()
      if (now - lastGenRef.current < 2 * 60 * 1000) return
      const nextId = genQueueRef.current.shift()
      if (!nextId) return

      setAudioStatus(st => ({ ...st, [nextId]: 'in_corso' }))
      lastGenRef.current = Date.now()

      const poesia = poesie.find(p => p.id === nextId)
      if (!poesia) return

      try {
        const res = await fetch(AUDIO_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env?.VITE_SUPABASE_ANON_KEY || '',
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
          setAudioStatus(st => ({ ...st, [nextId]: 'generato' }))
        } else {
          setAudioStatus(st => ({ ...st, [nextId]: 'non_generato' }))
        }
      } catch {
        setAudioStatus(st => ({ ...st, [nextId]: 'non_generato' }))
      }
    }

    const interval = setInterval(tryGenerate, 5000)
    return () => clearInterval(interval)
  }, [poesie, audioStatus])

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

      <div className="poesie-list" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {poesieFiltrate.length > 0 ? (
          poesieFiltrate.map(p => (
            <PoesiaBox
              key={p.id}
              poesia={p}
              audioState={audioStatus[p.id] || 'non_generato'}
            />
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
