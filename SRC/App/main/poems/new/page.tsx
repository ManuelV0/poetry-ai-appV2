'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useUser } from '@/lib/utils/useUser'
import { supabase } from '@/lib/utils/supabase'

export default function NewPoemPage() {
  const [poemText, setPoemText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { user } = useUser()

  const handleSubmit = async () => {
    if (!poemText.trim() || !user) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      // Salva poesia nel DB
      const { data: poem, error: dbError } = await supabase
        .from('poems')
        .insert({ 
          text: poemText, 
          user_id: user.id 
        })
        .select('id')
        .single()
      
      if (dbError || !poem) {
        throw dbError || new Error('Failed to save poem')
      }
      
      // Avvia analisi
      const analysisResponse = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: poemText, 
          poemId: poem.id 
        })
      })
      
      if (!analysisResponse.ok) {
        throw new Error('Analysis failed')
      }
      
      // Reindirizza ai risultati
      router.push(`/poems/${poem.id}`)
      
    } catch (err) {
      console.error('Submission error:', err)
      setError('Errore nel salvataggio della poesia')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Crea Nuova Poesia</h1>
      
      <Textarea
        value={poemText}
        onChange={(e) => setPoemText(e.target.value)}
        placeholder="Scrivi la tua poesia qui..."
        rows={10}
        className="mb-4"
      />
      
      {error && (
        <p className="text-red-500 mb-4">{error}</p>
      )}
      
      <Button 
        onClick={handleSubmit}
        disabled={isLoading}
      >
        {isLoading ? 'Analisi in corso...' : 'Analizza Poesia'}
      </Button>
    </div>
  )
}
