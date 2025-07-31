import Link from 'next/link'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface PoemMatch {
  id: string
  text: string
  similarity: number
  author_name?: string
  author_avatar?: string | null
}

export function PoemMatchCard({ poem }: { poem: PoemMatch }) {
  const similarityPercentage = Math.round(poem.similarity * 100)
  
  return (
    <Link href={`/poems/${poem.id}`} className="group">
      <div className="border rounded-lg overflow-hidden hover:shadow-lg transition-all h-full flex flex-col">
        <div className="p-4 flex-grow">
          <p className="line-clamp-5 italic text-gray-700 dark:text-gray-300 mb-4">
            "{poem.text}"
          </p>
        </div>
        
        <div className="border-t p-3 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={poem.author_avatar || undefined} />
                <AvatarFallback>
                  {poem.author_name?.charAt(0) || 'A'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {poem.author_name || 'Anonimo'}
              </span>
            </div>
            
            <div className={cn(
              "text-xs font-medium px-2 py-1 rounded-full",
              similarityPercentage > 75 ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
              similarityPercentage > 50 ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
              "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
            )}>
              {similarityPercentage}% match
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}