import React, { useState } from 'react'
import PoesieList from './PoesieList'

export default function App() {
  const [poesia, setPoesia] = useState('')
  const [risposta, setRisposta] = useState<any>(null)
  const [poesiaSelezionata, setPoesiaSelezionata] = useState<any>(null)

  const invia = async () => {
    const res = await fetch('/.netlify/functions/analizza', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: poesia,
        title: 'Senza titolo',
        author_name: 'Anonimo',
        user_id: '11111111-1111-1111-1111-111111111111' // UUID GPT o utente fittizio
      }),
    })

    const data = await res.json()
    setRisposta(data)
    setPoesiaSelezionata(null)
  }

  const mostraAnalisi = poesiaSelezionata || risposta

  return (
    <main className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Analizzatore Poetico</h1>

      {/* Poesia scritta manualmente */}
      <div className="mb-6">
        <textarea
          value={poesia}
          onChange={(e) => setPoesia(e.target.value)}
          placeholder="Scrivi la tua poesia qui..."
          className="w-full p-2 border rounded"
          rows={6}
        />
        <button
          onClick={invia}
          className="mt-2 bg-blue-600 text-white px-4 py-2 rounded"
        >
          Analizza
        </button>
      </div>

      <hr className="my-6" />

      {/* Poesie dal database */}
      {!poesiaSelezionata && !risposta && (
        <>
          <h2 className="text-xl font-semibold mb-2">Oppure scegli una poesia dal database</h2>
          <PoesieList onSelect={(p) => setPoesiaSelezionata(p)} />
        </>
      )}

      {/* Analisi mostrata */}
      {mostraAnalisi && (
        <div className="mt-6 border p-4 rounded shadow bg-gray-50">
          {poesiaSelezionata && (
            <>
              <h2 className="text-lg font-bold">{poesiaSelezionata.title}</h2>
              <p className="mb-4 whitespace-pre-wrap">{poesiaSelezionata.content}</p>
            </>
          )}

          <h3 className="font-semibold mt-4">Analisi Letteraria</h3>
          <pre className="bg-white p-2 text-sm overflow-x-auto mb-4">
            {JSON.stringify(mostraAnalisi.analisi_letteraria, null, 2)}
          </pre>

          <h3 className="font-semibold">Analisi Psicologica</h3>
          <pre className="bg-white p-2 text-sm overflow-x-auto">
            {JSON.stringify(mostraAnalisi.analisi_psicologica, null, 2)}
          </pre>

          <button
            className="mt-4 text-blue-600 underline"
            onClick={() => {
              setRisposta(null)
              setPoesiaSelezionata(null)
            }}
          >
            Torna indietro
          </button>
        </div>
      )}
    </main>
  )
}
