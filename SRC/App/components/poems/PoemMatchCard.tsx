import Link from 'next/link'

export function PoemMatchCard({ poem }: { poem: any }) {
  const similarityPercentage = Math.round((poem.similarity || 0) * 100)
  
  return (
    <Link href={`/poems/${poem.id}`}>
      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow h-full flex flex-col">
        <div className="flex-grow">
          <p className="line-clamp-4 mb-3 italic">{poem.text}</p>
        </div>
        
        <div className="flex justify-between items-center mt-auto">
          <span className="text-sm text-gray-500">
            {similarityPercentage}% match
          </span>
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
            Vedi dettagli
          </span>
        </div>
      </div>
    </Link>
  )
}
