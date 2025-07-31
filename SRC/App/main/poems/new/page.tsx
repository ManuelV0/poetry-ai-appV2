'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/utils/supabase'

export default function NewPoemPage() {
  const [text, setText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async () => {
    setIsLoading(true)
    
    try {
      // 1. Salva poesia nel DB
      const { data: poem, error } = await supabase
        .from('poems')
        .insert({ text })
        .select()
        .single()

      if (error) throw error

      // 2. Chiama analisi
      await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, poemId: poem.id })
      })

      router.push(`/poems/${poem.id}`)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Nuova Poesia</h1>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Scrivi la tua poesia qui..."
        rows={10}
        className="mb-4"
      />
      <Button 
        onClick={handleSubmit}
        disabled={isLoading || !text.trim()}
      >
        {isLoading ? 'Analisi in corso...' : 'Analizza Poesia'}
      </Button>
    </div>
  )
}