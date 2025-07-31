import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface PoemMatch {
  id: string
  text: string
  similarity: number
  username?: string
}

export function PoemMatchCard({ poem }: { poem: PoemMatch }) {
  return (
    <Link href={`/poems/${poem.id}`}>
      <div className="border rounded-lg p-4 hover:shadow-md transition-shadow h-full">
        <p className="line-clamp-4 mb-2">{poem.text}</p>
        <div className="flex justify-between items-center mt-auto">
          {poem.username && (
            <span className="text-sm text-gray-600">@{poem.username}</span>
          )}
          <Badge variant="outline">
            {Math.round(poem.similarity * 100)}% match
          </Badge>
        </div>
      </div>
    </Link>
  )
}