import React, { useState } from 'react'

export default function App() {
  const [poesia, setPoesia] = useState('')
  const [risposta, setRisposta] = useState<any>(null)
  const [caricamento, setCaricamento] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)

  const invia = async () => {
    setCaricamento(true)
    setErrore(null)
    setRisposta(null)

    try {
      const res = await fetch('/.netlify/functions/analizza', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ poesia, autore: 'Anonimo' }),
      })

      if (!res.ok) {
        throw new Error(`Errore: ${res.status}`)
      }

      const data = await res.json()
      setRisposta(data)
    } catch (err: any) {
      setErrore(err.message || 'Errore imprevisto')
    } finally {
      setCaricamento(false)
    }
  }

  return (
    <main className="p-4 max-w-xl mx-auto font-sans">
      <h1 className="text-2xl font-bold mb-4">Analizzatore Poetico</h1>

      <textarea
        value={poesia}
        onChange={(e) => setPoesia(e.target.value)}
        placeholder="Scrivi la tua poesia qui..."
        className="w-full p-2 border border-gray-300 rounded mb-4"
        rows={6}
      />

      <button
        onClick={invia}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        disabled={caricamento || poesia.trim() === ''}
      >
        {caricamento ? 'Analizzando...' : 'Analizza'}
      </button>

      {errore && (
        <div className="text-red-600 mt-4">
          Errore: {errore}
        </div>
      )}

      {risposta && (
        <pre className="bg-gray-100 mt-4 p-4 rounded text-sm overflow-auto">
          {JSON.stringify(risposta, null, 2)}
        </pre>
      )}
    </main>
  )
}
