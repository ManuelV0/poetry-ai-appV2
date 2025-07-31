import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { format } from 'date-fns'
import { it } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'

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
    <motion.div 
      className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg hover:shadow-xl transition-all duration-300 group"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Gradiente decorativo */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Pulsante decorativo */}
      <div className="absolute top-4 right-4 h-8 w-8 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
          <path d="M7 17l9.2-9.2M17 17V7H7" />
        </svg>
      </div>

      <div className="relative p-6">
        {/* Header con avatar */}
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="w-12 h-12 border-2 border-white shadow-md group-hover:border-purple-200 dark:group-hover:border-purple-500 transition-colors">
            <AvatarImage 
              src={poem.profiles?.avatar_url || undefined} 
              alt={poem.profiles?.username || 'Utente'} 
            />
            <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
              {poem.profiles?.username?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
              {poem.profiles?.username || 'Autore anonimo'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {format(new Date(poem.created_at), 'd MMMM yyyy', { locale: it })}
            </p>
          </div>
        </div>
        
        {/* Testo della poesia */}
        <div className="relative mb-4">
          <div className="absolute -left-6 top-0 h-full w-1 bg-gradient-to-b from-purple-400 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          <pre className="whitespace-pre-wrap font-serif text-lg text-gray-800 dark:text-gray-200 pl-4">
            {poem.text}
          </pre>
        </div>
        
        {/* Analisi */}
        {poem.analysis && (
          <motion.div 
            className="border-t border-gray-100 dark:border-gray-800 pt-4 mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors">
                {poem.analysis.tono}
              </Badge>
              {poem.analysis.temi.map((tema, i) => (
                <Badge 
                  key={i}
                  variant="outline"
                  className="border-purple-200 text-purple-700 dark:border-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/50 transition-colors"
                >
                  {tema}
                </Badge>
              ))}
            </div>
            
            {/* Metriche */}
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              <p><span className="font-medium">Versi:</span> {poem.analysis.metriche.versi}</p>
              <p><span className="font-medium">Schema metrico:</span> {poem.analysis.metriche.schemaMetrico}</p>
            </div>
          </motion.div>
        )}
      </div>
      
      {/* Effetto hover */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 to-pink-500 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
    </motion.div>
  )
}