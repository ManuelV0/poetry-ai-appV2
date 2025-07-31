import Link from 'next/link'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

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
    <Link href={`/poems/${poem.id}`}>
      <motion.div 
        className="relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-all duration-300 group h-full flex flex-col"
        whileHover={{ y: -5 }}
        transition={{ duration: 0.2 }}
      >
        {/* Gradiente decorativo */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 to-transparent dark:from-purple-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="p-5 flex-grow relative z-10">
          {/* Citazione decorativa */}
          <div className="absolute top-3 left-3 text-5xl text-purple-100 dark:text-purple-900/50 font-serif leading-none">"</div>
          
          <p className="line-clamp-5 italic text-gray-800 dark:text-gray-200 pl-8 relative z-20 font-serif text-lg">
            {poem.text}
          </p>
        </div>
        
        <div className="border-t border-gray-100 dark:border-gray-800 p-4 bg-gray-50 dark:bg-gray-800/50 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8 border-2 border-white dark:border-gray-800 shadow-sm group-hover:border-purple-200 dark:group-hover:border-purple-500 transition-colors">
                <AvatarImage src={poem.author_avatar || undefined} />
                <AvatarFallback className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm">
                  {poem.author_name?.charAt(0) || 'A'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                {poem.author_name || 'Anonimo'}
              </span>
            </div>
            
            <div className={cn(
              "text-xs font-semibold px-3 py-1 rounded-full shadow-inner transition-all duration-300",
              similarityPercentage > 75 ? "bg-green-100/90 text-green-800 dark:bg-green-900/80 dark:text-green-100 group-hover:bg-green-200/70 dark:group-hover:bg-green-800/90" :
              similarityPercentage > 50 ? "bg-blue-100/90 text-blue-800 dark:bg-blue-900/80 dark:text-blue-100 group-hover:bg-blue-200/70 dark:group-hover:bg-blue-800/90" :
              "bg-yellow-100/90 text-yellow-800 dark:bg-yellow-900/80 dark:text-yellow-100 group-hover:bg-yellow-200/70 dark:group-hover:bg-yellow-800/90"
            )}>
              {similarityPercentage}% match
            </div>
          </div>
        </div>
        
        {/* Barra animata */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 to-pink-500 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
      </motion.div>
    </Link>
  )
}