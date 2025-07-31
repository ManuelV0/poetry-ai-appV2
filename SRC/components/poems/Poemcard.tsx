import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'

interface Poem {
  id: string
  text: string
  created_at: string
  analysis?: {
    tono: string
    temi: string[]
    metriche: {
      versi: number
      schemaMetrico: string
    }
  }
  profiles?: {
    username: string | null
    avatar_url: string | null
  }
}

export function PoemCard({ poem }: { poem: Poem }) {
  return (
    <div className="border rounded-lg p-6 shadow-sm bg-white dark:bg-gray-900">
      <div className="flex items-center gap-3 mb-4">
        <Avatar className="w-10 h-10">
          <AvatarImage 
            src={poem.profiles?.avatar_url || undefined} 
            alt={poem.profiles?.username || 'Utente'} 
          />
          <AvatarFallback>
            {poem.profiles?.username?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">
            {poem.profiles?.username || 'Autore anonimo'}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {format(new Date(poem.created_at), 'd MMMM yyyy', { locale: it })}
          </p>
        </div>
      </div>
      
      <pre className="whitespace-pre-wrap font-sans text-lg mb-4">
        {poem.text}
      </pre>
      
      {poem.analysis && (
        <div className="border-t pt-4 mt-4">
          <div className="flex flex-wrap gap-2">
            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm dark:bg-blue-900 dark:text-blue-200">
              {poem.analysis.tono}
            </span>
            {poem.analysis.temi.map((tema, i) => (
              <span 
                key={i}
                className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm dark:bg-green-900 dark:text-green-200"
              >
                {tema}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}