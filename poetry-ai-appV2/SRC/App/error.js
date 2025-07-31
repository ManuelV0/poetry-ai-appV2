'use client'
export default function Error({ error, reset }) {
  return (
    <div className="grid min-h-full place-items-center px-6 py-24">
      <div className="text-center">
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900">
          Errore
        </h1>
        <button onClick={() => reset()} className="mt-4 text-blue-500">
          Riprova
        </button>
      </div>
    </div>
  )
}
