// src/App.tsx

import React, { useEffect, useState, useRef } from 'react'
import { supabase } from './lib/supabaseClient'

// ENDPOINTS
const AUDIO_API_URL = 'https://poetry.theitalianpoetryproject.com/.netlify/functions/genera-audio'
const POESIE_API_URL = '/.netlify/functions/poesie'
const ANALISI_API_URL = '/.netlify/functions/forza-analisi'

type AnalisiPsicologica = any
type AnalisiLetteraria = any

function isNonEmptyObject(v: any) {
  return v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0
}

function asText(v: any) {
  if (v == null) return 'N/A'
  const t = typeof v
  if (t === 'string') return v as string
  if (t === 'number' || t === 'boolean') return String(v)
  if (Array.isArray(v)) {
    // se è array di stringhe => elenco puntato gestito altrove; qui fallback sicuro
    return v.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(', ')
  }
  if (isNonEmptyObject(v)) return JSON.stringify(v, null, 2)
  return 'N/A'
}

function SafeList({ items }: { items?: any[] }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="text-gray-500 italic">N/A</p>
  }
  return (
    <ul className="list-disc list-inside ml-6">
      {items.map((x, i) => (
        <li key={i} className="whitespace-pre-wrap">
          {typeof x === 'string' ? x : JSON.stringify(x)}
        </li>
      ))}
    </ul>
  )
}

function CitazioniList({ items }: { items?: any[] }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="text-gray-500 italic">Nessuna citazione</p>
  }
  return (
    <ul className="list-disc list-inside ml-6">
      {items.map((c, i) => (
        <li key={i}>
          <span className="block whitespace-pre-wrap">«{asText(c)}»</span>
        </li>
      ))}
    </ul>
  )
}

function PoesiaBox({ poesia, audioState }) {
  const [aperta, setAperta] = useState(false)

  // Stato analisi: letteraria + psicologica (parse sicuro)
  const [analisiPsico, setAnalisiPsico] = useState<AnalisiPsicologica | null>(() => {
    try {
      const raw = poesia.analisi_psicologica
      if (!raw) return null
      const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
      return isNonEmptyObject(obj) ? obj : null
    } catch {
      return null
    }
  })

  const [analisiLett, setAnalisiLett] = useState<AnalisiLetteraria | null>(() => {
    try {
      const raw = poesia.analisi_letteraria
      if (!raw) return null
      const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
      return isNonEmptyObject(obj) ? obj : null
    } catch {
      return null
    }
  })

  const [analisiStatus, setAnalisiStatus] = useState<'idle' | 'loading' | 'success' | 'error'>(
    analisiPsico || analisiLett ? 'success' : 'idle'
  )
  const [analisiError, setAnalisiError] = useState<string | null>(null)
  const generazioneInCorsoRef = useRef(false)

  // AUDIO: etichetta stato
  let statoAudio = 'Non generato'
  if (audioState === 'generato') statoAudio = 'Audio generato'
  if (audioState === 'in_corso') statoAudio = 'Generazione in corso...'

  // Se apro la card e manca analisi, chiedo al backend di generarla
  useEffect(() => {
    const mancaAnalisi = !(analisiPsico || analisiLett)
    if (!aperta || !mancaAnalisi || generazioneInCorsoRef.current) return

    const genera = async () => {
      generazioneInCorsoRef.current = true
      setAnalisiStatus('loading')
      setAnalisiError(null)
      try {
        // 1) genera/forza analisi
        const res = await fetch(ANALISI_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: poesia.id, content: poesia.content })
        })
        if (!res.ok) {
          const t = await res.text().catch(() => '')
          throw new Error(t || `HTTP ${res.status}`)
        }

        // 2) ricarica la poesia con i campi analisi aggiornati
        const { data, error } = await supabase
          .from('poesie')
          .select('analisi_letteraria, analisi_psicologica')
          .eq('id', poesia.id)
          .single()
        if (error) throw error

        let nuovaPsico: any = data?.analisi_psicologica ?? null
        let nuovaLett: any = data?.analisi_letteraria ?? null
        try {
          if (typeof nuovaPsico === 'string') nuovaPsico = JSON.parse(nuovaPsico)
        } catch {}
        try {
          if (typeof nuovaLett === 'string') nuovaLett = JSON.parse(nuovaLett)
        } catch {}

        const okPsico = isNonEmptyObject(nuovaPsico)
        const okLett = isNonEmptyObject(nuovaLett)
        if (!okPsico && !okLett) throw new Error('Analisi assenti o non valide')

        setAnalisiPsico(okPsico ? nuovaPsico : null)
        setAnalisiLett(okLett ? nuovaLett : null)
        setAnalisiStatus('success')
      } catch (err) {
        setAnalisiStatus('error')
        setAnalisiError('Impossibile generare l’analisi ora. Riprova più tardi.')
      } finally {
        generazioneInCorsoRef.current = false
      }
    }

    genera()
  }, [aperta, analisiPsico, analisiLett, poesia.id, poesia.content])

  // ---- Blocchi di UI ----

  // (A) Analisi “Futurista Strategico” (vecchia struttura salvata in analisi_psicologica)
  const renderAnalisiFuturistaIfAny = () => {
    if (!analisiPsico) return null
    const a = analisiPsico
    const hasFuturista =
      Array.isArray(a?.vettori_di_cambiamento_attuali) ||
      a?.scenario_ottimistico ||
      a?.scenario_pessimistico ||
      a?.fattori_inattesi ||
      a?.dossier_strategico_oggi

    if (!hasFuturista) return null

    return (
      <>
        <section className="bg-green-50 p-5 rounded shadow-inner border border-green-300">
          <h3 className="font-bold text-green-800 mb-3 border-b border-green-400 pb-2 text-lg font-montserrat">
            Vettori di Cambiamento Attuali
          </h3>
          <SafeList items={a?.vettori_di_cambiamento_attuali} />
        </section>

        <section className="bg-blue-50 p-5 rounded shadow-inner border border-blue-300">
          <h3 className="font-bold text-blue-800 mb-3 border-b border-blue-400 pb-2 text-lg font-montserrat">
            Scenario Ottimistico
          </h3>
          <p className="text-blue-700 whitespace-pre-wrap">{asText(a?.scenario_ottimistico)}</p>
        </section>

        <section className="bg-red-50 p-5 rounded shadow-inner border border-red-300">
          <h3 className="font-bold text-red-800 mb-3 border-b border-red-400 pb-2 text-lg font-montserrat">
            Scenario Pessimistico
          </h3>
          <p className="text-red-700 whitespace-pre-wrap">{asText(a?.scenario_pessimistico)}</p>
        </section>

        <section className="bg-yellow-50 p-5 rounded shadow-inner border border-yellow-300">
          <h3 className="font-bold text-yellow-800 mb-3 border-b border-yellow-400 pb-2 text-lg font-montserrat">
            Fattori Inattesi
          </h3>
          <p>
            <strong>Positivo (Jolly):</strong> {asText(a?.fattori_inattesi?.positivo_jolly)}
          </p>
          <p>
            <strong>Negativo (Cigno Nero):</strong> {asText(a?.fattori_inattesi?.negativo_cigno_nero)}
          </p>
        </section>

        <section className="bg-indigo-50 p-5 rounded shadow-inner border border-indigo-300">
          <h3 className="font-bold text-indigo-800 mb-3 border-b border-indigo-400 pb-2 text-lg font-montserrat">
            Dossier Strategico per Oggi
          </h3>

          <p className="font-semibold">Azioni Preparatorie Immediate:</p>
          <SafeList items={a?.dossier_strategico_oggi?.azioni_preparatorie_immediate} />

          <p className="font-semibold mt-2">Opportunità Emergenti:</p>
          <SafeList items={a?.dossier_strategico_oggi?.opportunita_emergenti} />

          <p className="mt-2">
            <strong>Rischio Esistenziale da Mitigare:</strong>{' '}
            {asText(a?.dossier_strategico_oggi?.rischio_esistenziale_da_mitigare)}
          </p>
        </section>
      </>
    )
  }

  // (B) Analisi Psicologica Dettagliata (fallacie/bias/difese/autosabotaggi)
  const renderAnalisiPsicologicaDettagliata = () => {
    if (!analisiPsico) return null
    const a = analisiPsico

    const hasDetailed =
      Array.isArray(a?.fallacie_logiche) ||
      Array.isArray(a?.bias_cognitivi) ||
      Array.isArray(a?.meccanismi_di_difesa) ||
      Array.isArray(a?.schemi_autosabotanti)

    if (!hasDetailed) return null

    return (
      <>
        <section className="bg-rose-50 p-5 rounded shadow-inner border border-rose-300">
          <h3 className="font-bold text-rose-800 mb-3 border-b border-rose-400 pb-2 text-lg font-montserrat">
            Analisi Psicologica – Fallacie Logiche
          </h3>
          <SafeList items={a?.fallacie_logiche} />
        </section>

        <section className="bg-amber-50 p-5 rounded shadow-inner border border-amber-300">
          <h3 className="font-bold text-amber-800 mb-3 border-b border-amber-400 pb-2 text-lg font-montserrat">
            Analisi Psicologica – Bias Cognitivi
          </h3>
          <SafeList items={a?.bias_cognitivi} />
        </section>

        <section className="bg-purple-50 p-5 rounded shadow-inner border border-purple-300">
          <h3 className="font-bold text-purple-800 mb-3 border-b border-purple-400 pb-2 text-lg font-montserrat">
            Analisi Psicologica – Meccanismi di Difesa
          </h3>
          <SafeList items={a?.meccanismi_di_difesa} />
        </section>

        <section className="bg-sky-50 p-5 rounded shadow-inner border border-sky-300">
          <h3 className="font-bold text-sky-800 mb-3 border-b border-sky-400 pb-2 text-lg font-montserrat">
            Analisi Psicologica – Schemi Autosabotanti
          </h3>
          <SafeList items={a?.schemi_autosabotanti} />
        </section>
      </>
    )
  }

  // (C) Analisi Letteraria (temi/citazioni, narratore, stile, contesto, sintesi)
  const renderAnalisiLetteraria = () => {
    if (!analisiLett) return null
    const a = analisiLett

    const temi = a?.analisi_tematica_filosofica
    const stile = a?.analisi_stilistica_narratologica
    const contesto = a?.contesto_storico_biografico
    const sintesi = a?.sintesi_critica_conclusione

    const hasAnything =
      isNonEmptyObject(temi) || isNonEmptyObject(stile) || isNonEmptyObject(contesto) || !!sintesi

    if (!hasAnything) return null

    return (
      <>
        {/* 1. Analisi Tematica e Filosofica */}
        {isNonEmptyObject(temi) && (
          <section className="bg-emerald-50 p-5 rounded shadow-inner border border-emerald-300">
            <h3 className="font-bold text-emerald-800 mb-3 border-b border-emerald-400 pb-2 text-lg font-montserrat">
              Analisi Tematica e Filosofica
            </h3>

            {/* Temi principali */}
            {Array.isArray(temi?.temi_principali) && temi.temi_principali.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-emerald-900 mb-2">Temi principali</h4>
                {temi.temi_principali.map((t, i) => (
                  <div key={i} className="mb-3">
                    <p className="font-medium">{asText(t?.tema) || 'Tema'}</p>
                    {t?.spiegazione && <p className="text-emerald-800 whitespace-pre-wrap">{asText(t.spiegazione)}</p>}
                    {Array.isArray(t?.citazioni) && (
                      <div className="mt-1">
                        <p className="text-sm font-semibold">Citazioni:</p>
                        <CitazioniList items={t.citazioni} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Temi secondari */}
            {Array.isArray(temi?.temi_secondari) && temi.temi_secondari.length > 0 && (
              <div className="mb-2">
                <h4 className="font-semibold text-emerald-900 mb-2">Temi secondari</h4>
                <SafeList items={temi.temi_secondari} />
              </div>
            )}

            {/* Tesi filosofica */}
            {temi?.tesi_filosofica && (
              <div className="mt-2">
                <h4 className="font-semibold text-emerald-900 mb-1">Tesi filosofica</h4>
                <p className="text-emerald-800 whitespace-pre-wrap">{asText(temi.tesi_filosofica)}</p>
              </div>
            )}
          </section>
        )}

        {/* 2 & 3. Stilistica/Narratologia (e opzionale Personaggi) */}
        {isNonEmptyObject(stile) && (
          <section className="bg-indigo-50 p-5 rounded shadow-inner border border-indigo-300">
            <h3 className="font-bold text-indigo-800 mb-3 border-b border-indigo-400 pb-2 text-lg font-montserrat">
              Analisi Stilistica e Narratologica
            </h3>

            {/* Stile di scrittura: può essere stringa o oggetto (es. {ritmo, lessico, sintassi}) */}
            {stile?.stile && (
              <div className="mb-3">
                <h4 className="font-semibold text-indigo-900 mb-1">Stile di scrittura</h4>

                {typeof stile.stile === 'string' ? (
                  <p className="text-indigo-800 whitespace-pre-wrap">{stile.stile}</p>
                ) : isNonEmptyObject(stile.stile) ? (
                  <div className="text-indigo-800">
                    {Object.entries(stile.stile).map(([k, v]: [string, any]) => (
                      <p key={k} className="mb-1">
                        <span className="font-semibold capitalize">{k}:</span>{' '}
                        <span className="whitespace-pre-wrap">{asText(v)}</span>
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-indigo-800 whitespace-pre-wrap">{asText(stile.stile)}</p>
                )}
              </div>
            )}

            {/* Narratore e tempo */}
            {(stile?.narratore || stile?.tempo_narrativo) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {stile?.narratore && (
                  <div>
                    <h5 className="font-semibold text-indigo-900 mb-1">Narratore</h5>
                    <p className="text-indigo-800 whitespace-pre-wrap">{asText(stile.narratore)}</p>
                  </div>
                )}
                {stile?.tempo_narrativo && (
                  <div>
                    <h5 className="font-semibold text-indigo-900 mb-1">Tempo narrativo</h5>
                    <p className="text-indigo-800 whitespace-pre-wrap">{asText(stile.tempo_narrativo)}</p>
                  </div>
                )}
              </div>
            )}

            {/* Dispositivi retorici */}
            {Array.isArray(stile?.dispositivi_retorici) && stile.dispositivi_retorici.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-indigo-900 mb-2">Figure/Dispositivi retorici</h4>
                <ul className="list-disc list-inside ml-6 text-indigo-800">
                  {stile.dispositivi_retorici.map((d, i) => (
                    <li key={i} className="whitespace-pre-wrap">
                      <span className="font-medium">{asText(d?.nome) || 'Dispositivo'}</span>
                      {d?.effetto && <span>: {asText(d.effetto)}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Personaggi (se presenti sotto stile.personaggi) */}
            {Array.isArray(stile?.personaggi) && stile.personaggi.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-indigo-900 mb-2">Personaggi e Analisi Psicologica</h4>
                {stile.personaggi.map((p, i) => (
                  <div key={i} className="mb-3">
                    <p className="font-medium">{asText(p?.nome) || 'Personaggio'}</p>
                    {p?.arco && <p className="text-indigo-800 whitespace-pre-wrap">Arco: {asText(p.arco)}</p>}
                    {p?.motivazioni && (
                      <p className="text-indigo-800 whitespace-pre-wrap">Motivazioni: {asText(p.motivazioni)}</p>
                    )}
                    {Array.isArray(p?.meccanismi_di_difesa) && (
                      <>
                        <p className="text-sm font-semibold mt-1">Meccanismi di difesa:</p>
                        <SafeList items={p.meccanismi_di_difesa} />
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* 4. Contesto Storico e Biografico */}
        {isNonEmptyObject(contesto) && (
          <section className="bg-amber-50 p-5 rounded shadow-inner border border-amber-300">
            <h3 className="font-bold text-amber-800 mb-3 border-b border-amber-400 pb-2 text-lg font-montserrat">
              Contesto Storico e Biografico
            </h3>
            {contesto?.storico && (
              <>
                <h4 className="font-semibold text-amber-900 mb-1">Contesto storico-culturale</h4>
                <p className="text-amber-800 whitespace-pre-wrap mb-2">{asText(contesto.storico)}</p>
              </>
            )}
            {contesto?.biografico && (
              <>
                <h4 className="font-semibold text-amber-900 mb-1">Note biografiche rilevanti</h4>
                <p className="text-amber-800 whitespace-pre-wrap">{asText(contesto.biografico)}</p>
              </>
            )}
          </section>
        )}

        {/* 5. Sintesi Critica e Conclusione (stringa o oggetto con campi) */}
        {sintesi && (
          <section className="bg-slate-50 p-5 rounded shadow-inner border border-slate-300">
            <h3 className="font-bold text-slate-800 mb-3 border-b border-slate-400 pb-2 text-lg font-montserrat">
              Sintesi Critica e Conclusione
            </h3>

            {typeof sintesi === 'string' ? (
              <p className="text-slate-800 whitespace-pre-wrap">{sintesi}</p>
            ) : isNonEmptyObject(sintesi) ? (
              <div className="text-slate-800 space-y-2">
                {'sintesi' in sintesi && (
                  <div>
                    <h4 className="font-semibold">Sintesi</h4>
                    <p className="whitespace-pre-wrap">{asText((sintesi as any).sintesi)}</p>
                  </div>
                )}
                {'valutazione_finale' in sintesi && (
                  <div>
                    <h4 className="font-semibold">Valutazione finale</h4>
                    <p className="whitespace-pre-wrap">{asText((sintesi as any).valutazione_finale)}</p>
                  </div>
                )}
                {/* eventuali altri campi inattesi */}
                {Object.keys(sintesi).some(
                  (k) => k !== 'sintesi' && k !== 'valutazione_finale'
                ) && (
                  <div>
                    <h4 className="font-semibold">Dettagli</h4>
                    <pre className="whitespace-pre-wrap text-sm">{asText(sintesi)}</pre>
                  </div>
                )}
              </div>
            ) : (
              <pre className="whitespace-pre-wrap text-sm">{asText(sintesi)}</pre>
            )}
          </section>
        )}
      </>
    )
  }

  return (
    <div className="w-full border rounded-lg p-6 shadow-lg mb-6 bg-white transition-all hover:shadow-xl font-sans">
      {/* HEADER CARD */}
      <div
        className="cursor-pointer flex justify-between items-start"
        onClick={() => setAperta((v) => !v)}
        role="button"
        aria-expanded={aperta}
      >
        <div className="flex-1 pr-4">
          <h2 className="text-xl font-extrabold text-green-700 font-montserrat">
            {poesia.title || 'Senza titolo'}
          </h2>
          <p className="text-sm italic text-gray-500 mb-2 font-open-sans">
            {poesia.author_name || 'Anonimo'}
          </p>
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
          {(analisiPsico || analisiLett) && analisiStatus === 'success' && (
            <>
              {renderAnalisiPsicologicaDettagliata()}
              {renderAnalisiLetteraria()}
              {renderAnalisiFuturistaIfAny()}
            </>
          )}
          {!analisiPsico && !analisiLett && analisiStatus === 'idle' && (
            <div className="text-gray-500 italic text-sm">Analisi non disponibile per questa poesia.</div>
          )}
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [poesie, setPoesie] = useState<any[]>([])
  const [audioStatus, setAudioStatus] = useState<Record<string, 'non_generato' | 'in_corso' | 'generato'>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const lastGenRef = useRef(0)
  const genQueueRef = useRef<string[]>([])

  // Carica poesie dalla function
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

  // Stato audio derivato
  useEffect(() => {
    const next: Record<string, 'non_generato' | 'in_corso' | 'generato'> = {}
    for (const p of poesie) {
      if (p.audio_url) next[p.id] = 'generato'
      else if (audioStatus[p.id] === 'in_corso') next[p.id] = 'in_corso'
      else next[p.id] = 'non_generato'
    }
    setAudioStatus(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poesie])

  // Coda: genera UN audio ogni 2 minuti
  useEffect(() => {
    const daGenerare = poesie.filter((p) => !p.audio_url && audioStatus[p.id] !== 'in_corso')
    if (daGenerare.length === 0) return

    genQueueRef.current = daGenerare.map((p) => p.id)

    const tryGenerate = async () => {
      const now = Date.now()
      if (now - lastGenRef.current < 2 * 60 * 1000) return // 2 minuti
      const nextId = genQueueRef.current.shift()
      if (!nextId) return

      setAudioStatus((st) => ({ ...st, [nextId]: 'in_corso' }))
      lastGenRef.current = Date.now()

      const poesia = poesie.find((p) => p.id === nextId)
      if (!poesia) return

      try {
        const res = await fetch(AUDIO_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || ''
          },
          body: JSON.stringify({
            text: poesia.content,
            poesia_id: poesia.id
          })
        })
        const json = await res.json()
        if (json.audio_url) {
          await supabase.from('poesie').update({ audio_url: json.audio_url, audio_generated: true }).eq('id', poesia.id)
          setAudioStatus((st) => ({ ...st, [nextId]: 'generato' }))
        } else {
          setAudioStatus((st) => ({ ...st, [nextId]: 'non_generato' }))
        }
      } catch {
        setAudioStatus((st) => ({ ...st, [nextId]: 'non_generato' }))
      }
    }

    const interval = setInterval(tryGenerate, 5000) // check ogni 5 sec
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poesie, audioStatus])

  // Filtri ricerca
  const poesieFiltrate = poesie.filter(
    (p) =>
      p.title?.toLowerCase().includes(search.toLowerCase()) ||
      p.author_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.content?.toLowerCase().includes(search.toLowerCase())
  )

    return (
    <main className="max-w-lg sm:max-w-3xl mx-auto p-6 bg-gray-50 min-h-screen font-open-sans">
      <h1 className="text-3xl font-extrabold mb-6 text-center text-green-700 tracking-wide font-montserrat">
        TheItalianPoetryProject.com
      </h1>

      {/* Search */}
      <div className="mb-8 poetry-search-bar">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca per titolo, autore o testo..."
          className="w-full p-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-4 focus:ring-green-500 focus:border-transparent text-gray-700 text-lg"
          aria-label="Barra di ricerca poesie"
          autoComplete="off"
        />
      </div>

      {/* Stato lista */}
      {loading && <p className="text-center text-gray-500">Caricamento poesie...</p>}

      <div className="poesie-list" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {poesieFiltrate.length > 0 ? (
          poesieFiltrate.map((p) => (
            <PoesiaBox
              key={p.id}
              poesia={p}
              audioState={audioStatus[p.id] || 'non_generato'}
            />
          ))
        ) : (
          !loading && (
            <p className="text-center text-gray-400 mt-12 text-lg">
              Nessuna poesia trovata.
            </p>
          )
        )}
      </div>
    </main>
  )
}
