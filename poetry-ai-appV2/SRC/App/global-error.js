'use client'
export default function GlobalError({ error, reset }) {
  return (
    <html>
      <body className="text-center p-10">
        <h2 className="text-2xl font-bold">Errore irreversibile</h2>
        <button onClick={() => reset()} className="mt-4 text-blue-500">
          Riprova
        </button>
      </body>
    </html>
  )
}
