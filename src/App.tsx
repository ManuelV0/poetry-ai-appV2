import React, { useState } from 'react'

export default function App() {
  const [poesia, setPoesia] = useState('')
  const [risposta, setRisposta] = useState<any>(null)

  const invia = async () => {
    const res = await fetch('/.netlify/functions/analizza', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poesia, autore: "Anonimo" }),
    })
    const data = await res.json()
    setRisposta(data)
  }

  return (
    <main className="p-4 max-w-xl mx-auto">
      <h1>Analizzatore Poetico</h1>
      <textarea
        value={poesia}
        onChange={(e) => setPoesia(e.target.value)}
        placeholder="Scrivi la tua poesia qui..."
        className="w-full p-2 border my-4"
        rows={6}
      />
      <button onClick={invia}>Analizza</button>

      {risposta && (
        <pre className="bg-gray-100 mt-4 p-2 text-sm">
          {JSON.stringify(risposta, null, 2)}
        </pre>
      )}
    </main>
  )
}
