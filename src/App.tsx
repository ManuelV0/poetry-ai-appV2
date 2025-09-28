// src/App.tsx

import React, { useEffect, useState, useRef } from 'react'
import { supabase } from './lib/supabaseClient'

// ENDPOINTS
const AUDIO_API_URL = 'https://poetry.theitalianpoetryproject.com/.netlify/functions/genera-audio'
const POESIE_API_URL = '/.netlify/functions/poesie'
const ANALISI_API_URL = '/.netlify/functions/forza-analisi'

// tipi "morbidi" per essere tolleranti ai diversi formati che arrivano dal backend
type AnalisiPsicologica = any
type AnalisiLetteraria = any

function isNonEmptyObject(v: any) {
  return v && typeof v === 'object' && Object.keys(v).length > 0
}

function SafeList({ items }: { items?: any[] }) {
  if (!Array.isArray(items) || items.length === 0) return <p className="text-gray-500 italic">N/A</p>
  return (
    <ul className="list-disc list-inside ml-6">
      {items.map((x, i) => <li key={i}>{typeof x === 'string' ? x : JSON.stringify(x)}</li>)}
    </ul>
  )
}

function CitazioniList({ items }: { items?: string[] }) {
  if (!Array.isArray(items) || items.length === 0) return <p className="text-gray-500 italic">Nessuna citazione</p>
  return (
    <ul className="list-disc list-inside ml-6">
      {items.map((c, i) => (
        <li key={i}>
          <span className="block whitespace-pre-wrap">«{c}»</span>
        </li>
      ))}
    </ul>
  )
}

function LabelValue({ label, value }: { label: string, value?: string }) {
  if (!value) return null
  return (
    <p className="text-indigo-800"><span className="font-semibold">{label}:</span> {value}</p>
  )
}

/** Per array tipo [{ nome, evidenze:[] }] o semplici stringhe */
function EvidenceList({ items }: { items?: any[] }) {
  if (!Array.isArray(items) || items.length === 0) {
    return null
  }

  return (
    <ul className="list-disc list-inside ml-6">
      {items.map((item, i) => {
        if (typeof item === 'string') {
          return <li key={i}>{item}</li>
        }
        const nome = item?.nome ?? item?.tipo ?? item?.categoria ?? 'Elemento'
        const evidenze: string[] = Array.isArray(item?.evidenze) ? item.evidenze : []
        return (
          <li key={i} className="mb-2">
            <span className="font-medium">{nome}</span>
            {evidenze.length > 0 && (
              <ul className="list-disc list-inside ml-6 mt-1">
                {evidenze.map((ev, j) => <li key={j}>{ev}</li>)}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** Per dispositivi_retorici che possono essere string o { nome, effetto } */
function DevicesList({ items }: { items?: any[] }) {
  if (!Array.isArray(items) || items.length === 0) {
    return null
  }
  return (
    <ul className="list-disc list-inside ml-6 text-indigo-800">
      {items.map((d, i) => {
        if (typeof d === 'string') return <li key={i}>{d}</li>
        const nome = d?.nome || 'Dispositivo'
        const effetto = d?.effetto
        return (
          <li key={i}>
            <span className="font-medium">{nome}</span>
            {effetto ? <span>: {effetto}</span> : null}
          </li>
        )
      })}
    </ul>
  )
}

/** Per temi_secondari che possono essere string o { tema, commento, citazioni[] } */
function TemiSecondariList({ items }: { items?: any[] }) {
  if (!Array.isArray(items) || items.length === 0) {
    return null
  }
  return (
    <ul className="list-disc list-inside ml-6">
      {items.map((x, i) => {
        if (typeof x === 'string') return <li key={i}>{x}</li>
        return (
          <li key={i} className="mb-2">
            <span className="font-medium">{x?.tema || 'Tema'}</span>
            {x?.commento && <div className="text-emerald-800">{x.commento}</div>}
            {Array.isArray(x?.citazioni) && x.citazioni.length > 0 && (
              <div className="mt-1">
                <p className="text-sm font-semibold">Citazioni:</p>
                <CitazioniList items={x.citazioni} />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function PoesiaBox({ poesia, audioState }: { poesia: any, audioState: 'non_generato'|'in_corso'|'generato' }) {
  const [aperta, setAperta] = useState(false)

  // Stato analisi: letteraria + psicologica
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

  const [analisiStatus, setAnalisiStatus] = useState<'idle'|'loading'|'success'|'error'>(
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
    const mancaAnalisi = !(analisiPsico && analisiLett)
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

        let nuovaPsico = data?.analisi_psicologica ?? null
        let nuovaLett = data?.analisi_letteraria ?? null
        try { if (typeof nuovaPsico === 'string') nuovaPsico = JSON.parse(nuovaPsico) } catch {}
        try { if (typeof nuovaLett === 'string') nuovaLett = JSON.parse(nuovaLett) } catch {}

        const okPsico = isNonEmptyObject(nuovaPsico)
        const okLett = isNonEmptyObject(nuovaLett)

        if (!okPsico && !okLett) {
          throw new Error('Analisi assenti o non valide')
        }

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

  // Blocchi di UI
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
          <p className="text-blue-700">{a?.scenario_ottimistico || 'N/A'}</p>
        </section>

        <section className="bg-red-50 p-5 rounded shadow-inner border border-red-300">
          <h3 className="font-bold text-red-800 mb-3 border-b border-red-400 pb-2 text-lg font-montserrat">
            Scenario Pessimistico
          </h3>
          <p className="text-red-700">{a?.scenario_pessimistico || 'N/A'}</p>
        </section>

        <section className="bg-yellow-50 p-5 rounded shadow-inner border border-yellow-300">
          <h3 className="font-bold text-yellow-800 mb-3 border-b border-yellow-400 pb-2 text-lg font-montserrat">
            Fattori Inattesi
          </h3>
          <p><strong>Positivo (Jolly):</strong> {a?.fattori_inattesi?.positivo_jolly || 'N/A'}</p>
          <p><strong>Negativo (Cigno Nero):</strong> {a?.fattori_inattesi?.negativo_cigno_nero || 'N/A'}</p>
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
            {a?.dossier_strategico_oggi?.rischio_esistenziale_da_mitigare || 'N/A'}
          </p>
        </section>
      </>
    )
  }

  const renderAnalisiPsicologicaDettagliata = () => {
    if (!analisiPsico) return null
    const a = analisiPsico

    const hasDetailed =
      (Array.isArray(a?.fallacie_logiche) && a.fallacie_logiche.length > 0) ||
      (Array.isArray(a?.bias_cognitivi) && a.bias_cognitivi.length > 0) ||
      (Array.isArray(a?.meccanismi_di_difesa) && a.meccanismi_di_difesa.length > 0) ||
      (Array.isArray(a?.schemi_autosabotanti) && a.schemi_autosabotanti.length > 0)

    if (!hasDetailed) return null

    return (
      <>
        {Array.isArray(a?.fallacie_logiche) && a.fallacie_logiche.length > 0 && (
          <section className="bg-rose-50 p-5 rounded shadow-inner border border-rose-300">
            <h3 className="font-bold text-rose-800 mb-3 border-b border-rose-400 pb-2 text-lg font-montserrat">
              Fallacie Logiche
            </h3>
            <EvidenceList items={a?.fallacie_logiche} />
          </section>
        )}

        {Array.isArray(a?.bias_cognitivi) && a.bias_cognitivi.length > 0 && (
          <section className="bg-amber-50 p-5 rounded shadow-inner border border-amber-300">
            <h3 className="font-bold text-amber-800 mb-3 border-b border-amber-400 pb-2 text-lg font-montserrat">
              Bias Cognitivi
            </h3>
            <EvidenceList items={a?.bias_cognitivi} />
          </section>
        )}

        {Array.isArray(a?.meccanismi_di_difesa) && a.meccanismi_di_difesa.length > 0 && (
          <section className="bg-purple-50 p-5 rounded shadow-inner border border-purple-300">
            <h3 className="font-bold text-purple-800 mb-3 border-b border-purple-400 pb-2 text-lg font-montserrat">
              Meccanismi di Difesa
            </h3>
            <EvidenceList items={a?.meccanismi_di_difesa} />
          </section>
        )}

        {Array.isArray(a?.schemi_autosabotanti) && a.schemi_autosabotanti.length > 0 && (
          <section className="bg-sky-50 p-5 rounded shadow-inner border border-sky-300">
            <h3 className="font-bold text-sky-800 mb-3 border-b border-sky-400 pb-2 text-lg font-montserrat">
              Schemi Autosabotanti
            </h3>
            <EvidenceList items={a?.schemi_autosabotanti} />
          </section>
        )}
      </>
    )
  }

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
                {temi.temi_principali.map((t: any, i: number) => (
                  <div key={i} className="mb-3">
                    <p className="font-medium">{t?.tema || 'Tema'}</p>
                    {t?.spiegazione && <p className="text-emerald-800">{t.spiegazione}</p>}
                    {Array.isArray(t?.citazioni) && t.citazioni.length > 0 && (
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
                <TemiSecondariList items={temi.temi_secondari} />
              </div>
            )}

            {/* Tesi filosofica */}
            {temi?.tesi_filosofica && (
              <div className="mt-2">
                <h4 className="font-semibold text-emerald-900 mb-1">Tesi filosofica</h4>
                <p className="text-emerald-800">{temi.tesi_filosofica}</p>
              </div>
            )}
          </section>
        )}

        {/* 2 & 3. Stilistica/Narratologia (+eventuali personaggi) */}
        {isNonEmptyObject(stile) && (
          <section className="bg-indigo-50 p-5 rounded shadow-inner border border-indigo-300">
            <h3 className="font-bold text-indigo-800 mb-3 border-b border-indigo-400 pb-2 text-lg font-montserrat">
              Analisi Stilistica e Narratologica
            </h3>

            {/* Stile */}
            {stile?.stile && (
              <>
                <h4 className="font-semibold text-indigo-900 mb-1">Stile di scrittura</h4>
                {typeof stile.stile === 'string' ? (
                  <p className="text-indigo-800 mb-3">{stile.stile}</p>
                ) : (
                  <div className="text-indigo-800 mb-3">
                    <LabelValue label="Ritmo" value={stile.stile.ritmo} />
                    <LabelValue label="Lessico" value={stile.stile.lessico} />
                    <LabelValue label="Sintassi" value={stile.stile.sintassi} />
                  </div>
                )}
              </>
            )}

            {(stile?.narratore || stile?.tempo_narrativo) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {stile?.narratore && (
                  <div>
                    <h5 className="font-semibold text-indigo-900 mb-1">Narratore</h5>
                    <p className="text-indigo-800">{stile.narratore}</p>
                  </div>
                )}
                {stile?.tempo_narrativo && (
                  <div>
                    <h5 className="font-semibold text-indigo-900 mb-1">Tempo narrativo</h5>
                    <p className="text-indigo-800">{stile.tempo_narrativo}</p>
                  </div>
                )}
              </div>
            )}

            {Array.isArray(stile?.dispositivi_retorici) && stile.dispositivi_retorici.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-indigo-900 mb-2">Figure/Dispositivi retorici</h4>
                <DevicesList items={stile.dispositivi_retorici} />
              </div>
            )}

            {/* Personaggi */}
            {Array.isArray(stile?.personaggi) && stile.personaggi.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold text-indigo-900 mb-2">Personaggi e Analisi Psicologica</h4>
                {stile.personaggi.map((p: any, i: number) => (
                  <div key={i} className="mb-3">
                    <p className="font-medium">{p?.nome || 'Personaggio'}</p>
                    {p?.arco && <p className="text-indigo-800">Arco: {p.arco}</p>}
                    {p?.motivazioni && <p className="text-indigo-800">Motivazioni: {p.motivazioni}</p>}
                    {Array.isArray(p?.meccanismi_di_difesa) && p.meccanismi_di_difesa.length > 0 && (
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
                <p className="text-amber-800 mb-2">{contesto.storico}</p>
              </>
            )}
            {contesto?.biografico && (
              <>
                <h4 className="font-semibold text-amber-900 mb-1">Note biografiche rilevanti</h4>
                <p className="text-amber-800">{contesto.biografico}</p>
              </>
            )}
          </section>
        )}

        {/* 5. Sintesi Critica e Conclusione */}
        {sintesi && (
          <section className="bg-slate-50 p-5 rounded shadow-inner border border-slate-300">
            <h3 className="font-bold text-slate-800 mb-3 border-b border-slate-400 pb-2 text-lg font-montserrat">
              Sintesi Critica e Conclusione
            </h3>

            {typeof sintesi === 'string' ? (
              <p className="text-slate-800 whitespace-pre-wrap">{sintesi}</p>
            ) : (
              <>
                {sintesi?.sintesi && (
                  <>
                    <h4 className="font-semibold text-slate-900 mb-1">Sintesi</h4>
                    <p className="text-slate-800 mb-2 whitespace-pre-wrap">{sintesi.sintesi}</p>
                  </>
                )}
                {sintesi?.valutazione_finale && (
                  <>
                    <h4 className="font-semibold text-slate-900 mb-1">Valutazione finale</h4>
                    <p className="text-slate-800 whitespace-pre-wrap">{sintesi.valutazione_finale}</p>
                  </>
                )}
              </>
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
        onClick={() => setAperta(v => !v)}
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
        <div className="mt-8 space-y-10 font-open-sans">
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
              {/* ANALISI PSICOLOGICA */}
              {(renderAnalisiPsicologicaDettagliata() || renderAnalisiFuturistaIfAny()) && (
                <section>
                  <h2 className="text-2xl font-bold text-rose-900 mb-4 border-b border-rose-300 pb-1">
                    🧠 Analisi Psicologica
                  </h2>
                  {renderAnalisiPsicologicaDettagliata()}
                  {renderAnalisiFuturistaIfAny()}
                </section>
              )}

              {/* ANALISI LETTERARIA */}
              {renderAnalisiLetteraria() && (
                <section>
                  <h2 className="text-2xl font-bold text-indigo-900 mb-4 border-b border-indigo-300 pb-1">
                    📚 Analisi Letteraria
                  </h2>
                  {renderAnalisiLetteraria()}
                </section>
              )}
            </>
          )}
          {!analisiPsico && !analisiLett && analisiStatus === 'idle' && (
            <div className="text-gray-500 italic text-sm">
              Analisi non disponibile per questa poesia.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [poesie, setPoesie] = useState<any[]>([])
  const [audioStatus, setAudioStatus] = useState<Record<string, 'non_generato'|'in_corso'|'generato'>>({})
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
    const next: Record<string, 'non_generato'|'in_corso'|'generato'> = {}
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
    const daGenerare = poesie.filter(p => !p.audio_url && audioStatus[p.id] !== 'in_corso')
    if (daGenerare.length === 0) return

    genQueueRef.current = daGenerare.map(p => p.id)

    const tryGenerate = async () => {
      const now = Date.now()
      if (now - lastGenRef.current < 2 * 60 * 1000) return // 2 minuti
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
            'apikey': (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '',
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

    const interval = setInterval(tryGenerate, 5000) // check ogni 5 sec
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poesie, audioStatus])

  // Filtri ricerca
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

      {/* Search */}
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

      {/* Stato lista */}
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
            <p className="text-center text-gray-400 mt-12 text-lg">
              Nessuna poesia trovata.
            </p>
          )
        )}
      </div>
    </main>
  )
}
