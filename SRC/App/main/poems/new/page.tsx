'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useUser } from '@/lib/utils/useUser'
import { supabase } from '@/lib/utils/supabase'
import { Loader2 } from 'lucide-react'

export default function NewPoemPage() {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { user } = useUser()

  const handleSubmit = async () => {
    if (!text.trim() || !user?.id) return

    setLoading(true)
    setError(null)

    try {
      // 1. Salva poesia
      const { data: poem, error: dbError } = await supabase
        .from('poems')
        .insert({
          text,
          user_id: user.id
        })
        .select('id')
        .single()

      if (dbError || !poem) throw dbError || new Error('Save failed')

      // 2. Avvia analisi
      const analysisRes = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          poemId: poem.id
        })
      })

      if (!analysisRes.ok) throw new Error('Analysis failed')

      // 3. Redirect
      router.push(`/poems/${poem.id}`)

    } catch (err) {
      console.error('Submission error:', err)
      setError('Errore nel salvataggio')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Nuova Poesia</h1>
      
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Scrivi la tua poesia qui..."
        rows={10}
        className="mb-4 text-lg"
      />
      
      {error && (
        <p className="text-red-500 mb-4">{error}</p>
      )}
      
      <Button
        onClick={handleSubmit}
        disabled={loading || !text.trim()}
        className="w-full sm:w-auto"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analisi in corso...
          </>
        ) : (
          'Analizza Poesia'
        )}
      </Button>
    </div>
  )
}