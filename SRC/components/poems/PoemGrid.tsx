import { motion } from 'framer-motion'
import { PoemCard } from '@/components/poems/PoemCard'
import type { Poem } from '@/lib/types'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1]
    }
  },
  hover: {
    y: -5,
    transition: { duration: 0.2 }
  }
}

interface PoemsGridProps {
  poems: Poem[]
}

export function PoemsGrid({ poems }: PoemsGridProps) {
  return (
    <motion.div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 px-4 sm:px-6 py-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {poems.map((poem, index) => (
        <motion.div
          key={poem.id}
          variants={itemVariants}
          whileHover="hover"
          custom={index}
          className="relative"
        >
          {/* Effetto hover avanzato */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Ombra dinamica */}
          <div className="absolute inset-0 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          <PoemCard poem={poem} />
          
          {/* Indicatore di posizione (opzionale) */}
          {index < 4 && (
            <div className="absolute top-2 right-2 bg-white dark:bg-gray-800 text-xs font-medium px-2 py-1 rounded-full shadow-sm">
              #{index + 1}
            </div>
          )}
        </motion.div>
      ))}
    </motion.div>
  )
}