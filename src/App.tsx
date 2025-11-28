// App.tsx
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from './lib/supabaseClient';
import { FaArrowLeft, FaPlay, FaPause, FaStop, FaDownload } from 'react-icons/fa';
import './index.css';

// --- CONFIG ENDPOINTS ---
const FORZA_ANALISI_API = '/.netlify/functions/forza-analisi';
const AGGIORNA_JOURNAL_API = '/.netlify/functions/aggiorna-journal';
const REBUILD_JOURNAL_API = '/.netlify/functions/rebuild-journal';

// --- UTILS ---
function isIOSorSafari() {
  if (typeof navigator === "undefined") return false;
  return /iP(ad|hone|od)/.test(navigator.userAgent) ||
    (/Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent));
}

const isNonEmptyObject = (v: any) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 0;

// Calcolo statistiche poesia
const calculatePoetryStats = (text: string) => {
  const sanitized = (text ?? '').trim();
  if (!sanitized) return { lineCount: 0, wordCount: 0, uniqueWordCount: 0, characterCount: 0, averageWordsPerLine: 0, readingTimeSeconds: 0 };
  const lineCount = sanitized.split(/\r?\n/).filter(l => l.trim()).length;
  const wordsArray = sanitized.split(/\s+/).filter(Boolean);
  const uniqueWordCount = new Set(wordsArray.map(w => w.toLowerCase())).size;
  const characterCount = sanitized.replace(/\s+/g, '').length;
  const averageWordsPerLine = lineCount > 0 ? parseFloat((wordsArray.length / lineCount).toFixed(1)) : 0;
  const estimatedSeconds = Math.round((wordsArray.length / 180) * 60);
  const readingTimeSeconds = wordsArray.length === 0 ? 0 : Math.max(30, estimatedSeconds);
  return { lineCount, wordCount: wordsArray.length, uniqueWordCount, characterCount, averageWordsPerLine, readingTimeSeconds };
};

const formatReadingTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'Non stimabile';
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  if (minutes === 0) return `${remaining} sec`;
  if (remaining === 0) return `${minutes} min`;
  return `${minutes} min ${remaining} sec`;
};

// Safe list renderer
function SafeList({ items }: { items?: any[] }) {
  if (!Array.isArray(items) || items.length === 0) return <p className="text-gray-500 italic">N/A</p>;
  return (
    <ul className="list-disc list-inside ml-6">
      {items.map((x, i) => {
        if (typeof x === 'string' || typeof x === 'number' || typeof x === 'boolean') return <li key={i}>{String(x)}</li>;
        return <li key={i}><code className="whitespace-pre-wrap break-words">{JSON.stringify(x)}</code></li>;
      })}
    </ul>
  );
}

// Citazioni
function CitazioniList({ items }: { items?: string[] }) {
  if (!Array.isArray(items) || items.length === 0) return <p className="text-gray-500 italic">Nessuna citazione</p>;
  return (
    <ul className="list-disc list-inside ml-6">
      {items.map((c, i) => <li key={i}><span className="block whitespace-pre-wrap">«{c}»</span></li>)}
    </ul>
  );
}

// Key-Value block renderer
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
            <pre className="bg-slate-50 p-2 rounded border text-sm whitespace-pre-wrap break-words">{JSON.stringify(v, null, 2)}</pre>
          ) : (
            <p className="text-gray-500 italic">N/A</p>
          )}
        </div>
      ))}
    </div>
  );
}

// Audio player con highlight
const AudioPlayerWithHighlight = ({ content, audioUrl, onClose, onError }: { content: string, audioUrl: string, onClose: () => void, onError: (msg: string) => void }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const words = content.split(/(\s+)/).filter(w => w.trim().length > 0);
  const wordRefs = useRef<HTMLSpanElement[]>([]);
  const lastScrolledIndex = useRef(-1);
  const scrollCooldown = useRef(false);

  useEffect(() => {
    const audio = new Audio(audioUrl);
    audio.preload = 'metadata';
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      if (!audioRef.current) return;
      const currentTime = audioRef.current.currentTime;
      const duration = audioRef.current.duration || 1;
      const newProgress = currentTime / duration;
      setProgress(newProgress);

      const wordIndex = Math.floor(newProgress * words.length);
      setCurrentWordIndex(Math.min(wordIndex, words.length - 1));

      if (wordRefs.current[wordIndex] && wordIndex !== lastScrolledIndex.current && !scrollCooldown.current) {
        scrollCooldown.current = true;
        lastScrolledIndex.current = wordIndex;
        wordRefs.current[wordIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => { scrollCooldown.current = false; }, 300);
      }
    };

    const handleEnded = () => { setIsPlaying(false); setCurrentWordIndex(-1); };
    const handleError = () => { onError('Errore durante la riproduzione'); setIsPlaying(false); };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
    };
  }, [audioUrl, words.length, onError]);

  const togglePlayback = async () => {
    if (!audioRef.current) return;
    try {
      if (isPlaying) await audioRef.current.pause();
      else await audioRef.current.play();
      setIsPlaying(!isPlaying);
    } catch {
      onError('Impossibile avviare la riproduzione');
    }
  };

  const handleStop = () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; } setIsPlaying(false); setCurrentWordIndex(-1); setProgress(0); };
  const handleSpeedChange = (speed: number) => { if (audioRef.current) audioRef.current.playbackRate = speed; setPlaybackRate(speed); };

  return (
    <div className="audio-player-modal">
      <div className="audio-controls">
        <button onClick={togglePlayback}>{isPlaying ? <><FaPause /> Pausa</> : <><FaPlay /> Riproduci</>}</button>
        <button onClick={handleStop}><FaStop /> Stop</button>
        <div>Velocità: {[0.5,0.75,1,1.25,1.5].map(s => <button key={s} className={playbackRate===s?'active':''} onClick={()=>handleSpeedChange(s)}>{s}x</button>)}</div>
        <div className="progress-bar"><div className="progress-fill" style={{ width:`${progress*100}%` }}/></div>
        <button onClick={onClose}><FaArrowLeft /> Torna indietro</button>
      </div>
      <div className="content-highlight">{words.map((word,i)=><span key={i} ref={el=>el && (wordRefs.current[i]=el)} className={`word ${currentWordIndex===i?'highlight':''} ${Math.abs(currentWordIndex-i)<3?'glow':''}`}>{word}</span>)}</div>
    </div>
  );
};

// --- Pagina singola poesia ---
const PoetryPage = ({ poesia, onBack }: { poesia: any; onBack: () => void }) => {
  const [audioUrl, setAudioUrl] = useState<string | null>(poesia.audio_url || null);
  const [audioStatus, setAudioStatus] = useState<'non_generato'|'in_corso'|'generato'>(poesia.audio_url?'generato':'non_generato');
  const [audioError, setAudioError] = useState<string | null>(null);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle'|'copied'|'error'>('idle');

  const analisiPsico = useMemo(()=>{ try{ return typeof poesia.analisi_psicologica==='string'?JSON.parse(poesia.analisi_psicologica):poesia.analisi_psicologica; }catch{return null;} }, [poesia.analisi_psicologica]);
  const analisiLett = useMemo(()=>{ try{ return typeof poesia.analisi_letteraria==='string'?JSON.parse(poesia.analisi_letteraria):poesia.analisi_letteraria; }catch{return null;} }, [poesia.analisi_letteraria]);
  const poesiaStats = useMemo(()=>calculatePoetryStats(poesia.content||''), [poesia.content]);

  // reset copia
  useEffect(()=>{ if(copyStatus==='idle') return; const t=setTimeout(()=>setCopyStatus('idle'),2000); return ()=>clearTimeout(t); }, [copyStatus]);

  const handleCopyContent = useCallback(async ()=>{
    const text = poesia.content||'';
    if(!text.trim()){setCopyStatus('error');return;}
    try{
      if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);}
      else{const ta=document.createElement('textarea'); ta.value=text; ta.setAttribute('readonly',''); ta.style.position='absolute'; ta.style.left='-9999px'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);}
      setCopyStatus('copied');
    }catch{setCopyStatus('error');}
  },[poesia.content]);

  // Generazione audio + analisi con FORZA_ANALISI_API
  const handleGeneraAudioEAnalisi = useCallback(async ()=>{
    if(audioStatus==='in_corso') return;
    setAudioStatus('in_corso');
    try{
      const res = await fetch(FORZA_ANALISI_API,{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id:poesia.id, content:poesia.content})});
      const json = await res.json();
      if(json.audio_url){ setAudioUrl(json.audio_url); setAudioStatus('generato'); await supabase.from('poesie').update({audio_url:json.audio_url, audio_generated:true}).eq('id',poesia.id);}
      if(json.analisi_psicologica) poesia.analisi_psicologica=json.analisi_psicologica;
      if(json.analisi_letteraria) poesia.analisi_letteraria=json.analisi_letteraria;
    }catch(err){console.error(err); setAudioStatus('non_generato'); setAudioError('Errore generazione audio/analisi');}
  },[poesia, audioStatus]);

  return (
    <div className="poetry-page">
      <button onClick={onBack}><FaArrowLeft /> Torna all'elenco</button>
      <h1>{poesia.title}</h1>
      <p className="author">{poesia.author_name||'Anonimo'}</p>
      <pre>{poesia.content}</pre>

      <div className="audio-section">
        {audioStatus==='non_generato' && <button onClick={handleGeneraAudioEAnalisi}>Genera Audio & Analisi</button>}
        {audioStatus==='in_corso' && <p>Generazione in corso...</p>}
        {audioStatus==='generato' && audioUrl && <button onClick={()=>setShowAudioPlayer(true)}><FaPlay /> Ascolta con highlight</button>}
        {audioError && <p>{audioError}</p>}
      </div>

      <section className="poetry-tools">
        <ul>
          <li>Linee: {poesiaStats.lineCount}</li>
          <li>Parole: {poesiaStats.wordCount}</li>
          <li>Parole uniche: {poesiaStats.uniqueWordCount}</li>
          <li>Media parole/linea: {poesiaStats.averageWordsPerLine}</li>
          <li>Caratteri: {poesiaStats.characterCount}</li>
          <li>Tempo lettura stimato: {formatReadingTime(poesiaStats.readingTimeSeconds)}</li>
        </ul>
        <button onClick={handleCopyContent}>Copia testo</button>
        {copyStatus==='copied' && <span>✅ Copiato!</span>}
      </section>

      {/* Analisi Psicologica */}
      {isNonEmptyObject(analisiPsico) && (
        <section>
          <h2>Analisi Psicologica</h2>
          <KeyValueBlock data={analisiPsico} />
        </section>
      )}

      {/* Analisi Letteraria */}
      {isNonEmptyObject(analisiLett) && (
        <section>
          <h2>Analisi Letteraria</h2>
          <KeyValueBlock data={analisiLett} />
        </section>
      )}

      {showAudioPlayer && audioUrl && (
        <AudioPlayerWithHighlight content={poesia.content} audioUrl={audioUrl} onClose={()=>setShowAudioPlayer(false)} onError={setAudioError} />
      )}
    </div>
  );
};

// --- Lista / App ---
const App = () => {
  const [state, setState] = useState<{poesie:any[], loading:boolean, error:string|null, search:string, selectedPoesia:any|null}>({poesie:[], loading:true, error:null, search:'', selectedPoesia:null});

  const fetchPoesie = useCallback(async()=>{
    setState(prev=>({...prev, loading:true, error:null}));
    try{
      const { data, error } = await supabase.from('poesie').select('*').order('created_at',{ascending:false}).limit(50);
      if(error) throw error;
      setState(prev=>({...prev, poesie:data||[], loading:false}));
    }catch{ setState(prev=>({...prev, error:'Errore caricamento', loading:false})); }
  },[]);

  useEffect(()=>{ fetchPoesie(); const i=setInterval(fetchPoesie,300000); return ()=>clearInterval(i); },[fetchPoesie]);

  const poesieFiltrate = useMemo(()=>{
    const s = state.search.trim().toLowerCase();
    if(!s) return state.poesie;
    return state.poesie.filter(p=>{
      const fields = [p.title,p.author_name,p.content].filter(f=>typeof f==='string'&&f.length>0).map(f=>f.toLowerCase());
      return fields.some(f=>f.includes(s));
    });
  },[state.poesie, state.search]);

  return (
    <div className="app-container">
      {state.selectedPoesia ? (
        <PoetryPage poesia={state.selectedPoesia} onBack={()=>setState(prev=>({...prev, selectedPoesia:null}))} />
      ) : (
        <>
          <header>
            <input type="search" value={state.search} onChange={e=>setState(prev=>({...prev, search:e.target.value}))} placeholder="Cerca poesie..." />
          </header>
          {state.loading && <p>Caricamento...</p>}
          {state.error && <p>{state.error}</p>}
          {poesieFiltrate.map(p => (
            <div key={p.id} onClick={()=>setState(prev=>({...prev, selectedPoesia:p}))}>
              <h3>{p.title}</h3>
              <p>{p.author_name||'Anonimo'}</p>
              <p>{(p.content||'').slice(0,120)}...</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default App;