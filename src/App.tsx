// App.tsx (top of the file)

// Inizio modifica/aggiunta - aggiunto useMemo all'import
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from './lib/supabaseClient';
import { FaArrowLeft, FaPlay, FaPause, FaStop, FaDownload } from 'react-icons/fa';
import './index.css'    

// --- CONFIG ENDPOINTS ---
const AUDIO_API_URL = 'https://poetry.theitalianpoetryproject.com/.netlify/functions/genera-audio';

// --- UTILS ---
function isIOSorSafari() {
  if (typeof navigator === "undefined") return false;
  return /iP(ad|hone|od)/.test(navigator.userAgent) ||
    (/Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent));
}

const isNonEmptyObject = (v: any) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0;

// Inizio modifica/aggiunta - calcolo statistiche poesia
const calculatePoetryStats = (text: string) => {
  const sanitized = (text ?? '').trim();
  if (!sanitized) {
    return {
      lineCount: 0,
      wordCount: 0,
      uniqueWordCount: 0,
      characterCount: 0,
      averageWordsPerLine: 0,
      readingTimeSeconds: 0
    };
  }
  const lineCount = sanitized.split(/\r?\n/).filter(line => line.trim().length > 0).length;
  const wordsArray = sanitized.split(/\s+/).filter(Boolean);
  const uniqueWordCount = new Set(wordsArray.map(word => word.toLowerCase())).size;
  const characterCount = sanitized.replace(/\s+/g, '').length;
  const averageWordsPerLine = lineCount > 0 ? parseFloat((wordsArray.length / lineCount).toFixed(1)) : 0;
  const estimatedSeconds = Math.round((wordsArray.length / 180) * 60);
  const readingTimeSeconds = wordsArray.length === 0 ? 0 : Math.max(30, estimatedSeconds);
  return {
    lineCount,
    wordCount: wordsArray.length,
    uniqueWordCount,
    characterCount,
    averageWordsPerLine,
    readingTimeSeconds
  };
};

// Inizio modifica/aggiunta - formattazione tempo di lettura
const formatReadingTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 'Non stimabile';
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes === 0) {
    return `${remainingSeconds} sec`;
  }
  if (remainingSeconds === 0) {
    return `${minutes} min`;
  }
  return `${minutes} min ${remainingSeconds} sec`;
};

// Mostra liste di stringhe o oggetti (oggetti formattati)
function SafeList({ items }: { items?: any[] }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="text-gray-500 italic">N/A</p>;
  }
  return (
    <ul className="list-disc list-inside ml-6">
      {items.map((x, i) => {
        if (typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean') {
          return <li key={i}>{String(x)}</li>;
        }
        // Oggetto generico -> pretty print minimale
        return <li key={i}><code className="whitespace-pre-wrap break-words">{JSON.stringify(x)}</code></li>;
      })}
    </ul>
  );
}

// Lista di citazioni (stringhe)
function CitazioniList({ items }: { items?: string[] }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="text-gray-500 italic">Nessuna citazione</p>;
  }
  return (
    <ul className="list-disc list-inside ml-6">
      {items.map((c, i) => (
        <li key={i}>
          <span className="block whitespace-pre-wrap">«{c}»</span>
        </li>
      ))}
    </ul>
  );
}

// Render per coppie chiave→valore
function KeyValueBlock({ data }: { data?: any }) {
  if (!isNonEmptyObject(data)) return null;
  return (
    <div className="grid gap-2">
      {Object.entries<any>(data).map(([k, v]) => (
        <div key={k}>
          <p className="font-semibold capitalize">{k.replaceAll('_', ' ')}</p>
          {typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? (
            <p className="text-slate-800 whitespace-pre-wrap">{String(v)}</p>
          ) : Array.isArray(v) ? (
            <SafeList items={v} />
          ) : isNonEmptyObject(v) ? (
            <pre className="bg-slate-50 p-2 rounded border text-sm whitespace-pre-wrap break-words">
              {JSON.stringify(v, null, 2)}
            </pre>
          ) : (
            <p className="text-gray-500 italic">N/A</p>
          )}
        </div>
      ))}
    </div>
  );
}
// --- AUDIO PLAYER WITH HIGHLIGHT ---
const AudioPlayerWithHighlight = ({
  audioUrl,
  poetryLines,
  onStop
}: {
  audioUrl: string;
  poetryLines: string[];
  onStop?: () => void;
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);

  const iosSafari = useMemo(() => isIOSorSafari(), []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const tick = () => {
      if (!audio.duration || poetryLines.length === 0) return;
      const percent = audio.currentTime / audio.duration;
      const idx = Math.floor(percent * poetryLines.length);
      if (idx !== highlightIndex) setHighlightIndex(idx);
    };

    const interval = setInterval(tick, 300);
    return () => clearInterval(interval);
  }, [highlightIndex, poetryLines.length]);

  const handlePlay = async () => {
    if (!audioRef.current) return;
    try {
      await audioRef.current.play();
      setIsPlaying(true);
      console.log("Audio avviato");
    } catch (err) {
      // Retry automatico
      setTimeout(() => {
        audioRef.current?.play().catch(e => console.error("Secondo tentativo fallito:", e));
      }, 500);
    }
  };

  const handlePause = () => {
    audioRef.current?.pause();
    setIsPlaying(false);
  };

  const handleStop = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setHighlightIndex(null);
    onStop?.();
  };

  const downloadAudio = () => {
    if (!audioUrl) return;
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = 'poesia.mp3';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mt-6 p-4 border rounded-lg bg-slate-50 shadow-sm">
      <h3 className="text-lg font-semibold mb-2">🎧 Ascolta la poesia</h3>

      <audio ref={audioRef} src={audioUrl} preload="auto" />

      {/* PLAY + PAUSE + STOP + DOWNLOAD */}
      <div className="flex gap-3 mt-3">
        {!isPlaying ? (
          <button onClick={handlePlay} className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2">
            <FaPlay /> Play
          </button>
        ) : (
          <button onClick={handlePause} className="px-4 py-2 bg-yellow-600 text-white rounded flex items-center gap-2">
            <FaPause /> Pausa
          </button>
        )}

        <button onClick={handleStop} className="px-4 py-2 bg-red-600 text-white rounded flex items-center gap-2">
          <FaStop /> Stop
        </button>

        <button onClick={downloadAudio} className="px-4 py-2 bg-green-600 text-white rounded flex items-center gap-2">
          <FaDownload /> Download
        </button>
      </div>

      {/* HIGHLIGHT LINES */}
      <div className="mt-4 bg-white p-3 rounded border max-h-64 overflow-auto leading-relaxed">
        {poetryLines.map((line, index) => (
          <p
            key={index}
            className={
              index === highlightIndex
                ? "bg-yellow-200 p-1 rounded font-semibold"
                : ""
            }
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
};



// --- POETRY PAGE ---
function PoetryPage({ poem, onBack }: { poem: any; onBack: () => void }) {
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(poem.audio_url || null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [errorGeneratingAudio, setErrorGeneratingAudio] = useState<string | null>(null);

  const textRef = useRef<HTMLDivElement>(null);

  // Inizio modifica/aggiunta - calcola statistiche
  const stats = useMemo(() => calculatePoetryStats(poem.poetry_text ?? ''), [poem.poetry_text]);

  // Inizio modifica/aggiunta - copia negli appunti
  const handleCopyToClipboard = useCallback(() => {
    if (!poem.poetry_text) return;
    navigator.clipboard.writeText(poem.poetry_text.trim());
  }, [poem.poetry_text]);

  const handleCopyAllAnalyses = useCallback(() => {
    if (!poem.analisi) return;
    const fullAnalysis = JSON.stringify(poem.analisi, null, 2);
    navigator.clipboard.writeText(fullAnalysis);
  }, [poem.analisi]);

  const generateAudio = async () => {
    if (!poem?.id) {
      setErrorGeneratingAudio("ID poesia non valido");
      return;
    }

    try {
      setIsGeneratingAudio(true);
      setErrorGeneratingAudio(null);

      const res = await fetch(AUDIO_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          poetry_id: poem.id,
          text: poem.poetry_text
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Errore server: ${errText}`);
      }

      const data = await res.json();
      if (!data.audioUrl) throw new Error("Risposta API invalida");

      // Aggiornamento Supabase
      const { error } = await supabase
        .from("poems")
        .update({ audio_url: data.audioUrl })
        .eq("id", poem.id);

      if (error) {
        console.error("Errore aggiornamento Supabase:", error);
        throw new Error("Audio generato ma non salvato in database");
      }

      setAudioUrl(data.audioUrl);
    } catch (err: any) {
      setErrorGeneratingAudio(err.message || "Errore sconosciuto");
    } finally {
      setIsGeneratingAudio(false);
    }
  };
  return (
    <div className="max-w-3xl mx-auto">
      {/* BACK BUTTON */}
      <button onClick={onBack} className="mb-4 text-blue-600 flex items-center gap-2">
        <FaArrowLeft /> Torna alla lista
      </button>

      {/* TITLE */}
      <h1 className="text-3xl font-bold mb-2">{poem.title}</h1>

      {/* AUTHOR + DATE */}
      <p className="text-gray-600 mb-6">
        {poem.author || "Autore sconosciuto"} • {poem.created_at?.split("T")[0]}
      </p>

      {/* POETRY BODY */}
      <div
        ref={textRef}
        className="whitespace-pre-wrap text-lg leading-relaxed p-4 bg-white shadow rounded border"
      >
        {poem.poetry_text}
      </div>

      {/* COPY BUTTON */}
      <button
        onClick={handleCopyToClipboard}
        className="mt-3 px-4 py-2 bg-slate-800 text-white rounded shadow hover:bg-slate-900"
      >
        📋 Copia testo poesia
      </button>

      {/* POETRY STATS */}
      <div className="mt-6 p-4 bg-slate-50 border rounded shadow-sm">
        <h2 className="font-semibold text-xl mb-3">📊 Statistiche della poesia</h2>

        <ul className="space-y-1 text-slate-700">
          <li><strong>Versi:</strong> {stats.lineCount}</li>
          <li><strong>Parole totali:</strong> {stats.wordCount}</li>
          <li><strong>Parole uniche:</strong> {stats.uniqueWordCount}</li>
          <li><strong>Caratteri (senza spazi):</strong> {stats.characterCount}</li>
          <li><strong>Media parole per verso:</strong> {stats.averageWordsPerLine}</li>
          <li><strong>Tempo di lettura stimato:</strong> {formatReadingTime(stats.readingTimeSeconds)}</li>
        </ul>
      </div>

      {/* AUDIO PLAYER */}
      {audioUrl ? (
        <AudioPlayerWithHighlight
          audioUrl={audioUrl}
          poetryLines={(poem.poetry_text || "").split(/\r?\n/)}
        />
      ) : (
        <div className="mt-6 p-4 bg-yellow-50 border rounded">
          <p className="font-semibold">🎧 Nessun audio disponibile</p>
          <p className="text-sm text-gray-600 mb-2">
            Clicca il pulsante sotto per generare la recitazione della poesia.
          </p>
          <button
            onClick={generateAudio}
            disabled={isGeneratingAudio}
            className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
          >
            {isGeneratingAudio ? "🎙 Generazione in corso…" : "Genera Audio"}
          </button>

          {errorGeneratingAudio && (
            <p className="mt-2 text-red-600 text-sm">{errorGeneratingAudio}</p>
          )}
        </div>
      )}

      {/* ANALYSIS SECTION */}
      <div className="mt-10 border-t pt-6">
        <h2 className="text-2xl font-semibold mb-4">🧠 Analisi della poesia</h2>

        {!showFullAnalysis ? (
          <button
            onClick={() => setShowFullAnalysis(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded"
          >
            Mostra analisi completa
          </button>
        ) : (
          <>
            {/* COPY */}
            <button
              onClick={handleCopyAllAnalyses}
              className="mb-4 px-4 py-2 bg-slate-700 text-white rounded"
            >
              📄 Copia analisi completa
            </button>

            {/* PSICOLOGICA */}
            {poem.analisi?.psicologica && (
              <section className="mb-8">
                <h3 className="text-xl font-bold text-pink-700">🧩 Analisi Psicologica</h3>
                <KeyValueBlock data={poem.analisi.psicologica} />
              </section>
            )}

            {/* FUTURISTA */}
            {poem.analisi?.futurista && (
              <section className="mb-8">
                <h3 className="text-xl font-bold text-orange-700">🚀 Visione Futuristica</h3>
                <KeyValueBlock data={poem.analisi.futurista} />
              </section>
            )}

            {/* LETTERARIA */}
            {poem.analisi?.letteraria && (
              <section className="mb-8">
                <h3 className="text-xl font-bold text-blue-700">📚 Analisi Letteraria</h3>
                <KeyValueBlock data={poem.analisi.letteraria} />
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// --- MAIN APP ---
function App() {
  const [poems, setPoems] = useState<any[]>([]);
  const [selectedPoem, setSelectedPoem] = useState<any | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const loadPoems = async () => {
      const { data, error } = await supabase
        .from("poems")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Errore caricamento poesie:", error);
        return;
      }

      setPoems(data || []);
    };

    loadPoems();
  }, []);

  const filteredPoems = poems.filter((p) =>
    (p.title || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.author || "").toLowerCase().includes(search.toLowerCase()) ||
    (p.poetry_text || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6">
      {selectedPoem ? (
        <PoetryPage poem={selectedPoem} onBack={() => setSelectedPoem(null)} />
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-4">📜 Le tue poesie</h1>

          {/* SEARCH BAR */}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per titolo, autore o testo…"
            className="w-full p-2 mb-4 border rounded"
          />

          {/* POEMS LIST */}
          <div className="space-y-4">
            {filteredPoems.length === 0 ? (
              <p className="text-gray-600">Nessuna poesia trovata.</p>
            ) : (
              filteredPoems.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPoem(p)}
                  className="p-4 border rounded bg-white hover:bg-slate-50 cursor-pointer shadow-sm"
                >
                  <h2 className="text-xl font-semibold">{p.title}</h2>
                  <p className="text-gray-600 text-sm">{p.author}</p>
                  <p className="text-gray-800 mt-2 line-clamp-2 whitespace-pre-wrap">
                    {p.poetry_text}
                  </p>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default App;