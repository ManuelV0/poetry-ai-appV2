// src/pages/analizza.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { analizzaPoesiaSeNuova } from '../lib/analizzaNuova';

export default function AnalizzaPoesie() {
  const [poesie, setPoesie] = useState<any[]>([]);
  const [output, setOutput] = useState<any | null>(null);
  const [loadingId, setLoadingId] = useState<number | null>(null);

  // Carica le poesie esistenti dal DB
  useEffect(() => {
    const fetchPoesie = async () => {
      const { data, error } = await supabase
        .from('poesie')
        .select('id, title, content, author_name, analisi_letteraria');

      if (error) console.error('Errore nel recupero poesie:', error);
      else setPoesie(data || []);
    };

    fetchPoesie();
  }, []);

  // Funzione per avviare l’analisi
  const handleAnalizza = async (poesia: any) => {
    setLoadingId(poesia.id);
    setOutput(null);

    const risultato = await analizzaPoesiaSeNuova(poesia.content, poesia.author_name, poesia.id);
    setOutput({ ...risultato, title: poesia.title });
    setLoadingId(null);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>
      <h1>📚 Analizza una poesia</h1>
      <p>Scegli una poesia esistente e avvia l’analisi automatica AI.</p>

      <ul style={{ marginTop: '2rem' }}>
        {poesie.map((poesia) => (
          <li key={poesia.id} style={{ marginBottom: '1.5rem', borderBottom: '1px solid #ddd', paddingBottom: '1rem' }}>
            <h3>{poesia.title} — <em>{poesia.author_name}</em></h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{poesia.content.slice(0, 120)}...</p>

            {poesia.analisi_letteraria ? (
              <button onClick={() => setOutput({ ...poesia, title: poesia.title })}>
                🔍 Visualizza analisi
              </button>
            ) : (
              <button onClick={() => handleAnalizza(poesia)} disabled={loadingId === poesia.id}>
                {loadingId === poesia.id ? 'Analisi in corso...' : '⚡ Analizza ora'}
              </button>
            )}
          </li>
        ))}
      </ul>

      {output && (
        <div style={{ marginTop: '3rem', background: '#f9f9f9', padding: '1.5rem', borderRadius: '8px' }}>
          <h2>🧠 Analisi per: {output.title}</h2>
          <h3>📖 Analisi Letteraria</h3>
          <pre>{JSON.stringify(output.analisi_letteraria, null, 2)}</pre>

          <h3>🪞 Analisi Psicologica</h3>
          <pre>{JSON.stringify(output.analisi_psicologica, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}