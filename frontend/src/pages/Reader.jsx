import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import TutorPanel from '../components/TutorPanel';
import ChapterImage from '../components/ChapterImage';
import API from '../api/axios';
import { isSpeechSupported, loadVoices, speechController, speechLocale, voicesForLanguage } from '../utils/speech';

const paragraphsOf = (text = '') => text.split(/\n\s*\n|(?<=\.)\s*\n/).map((p) => p.trim()).filter(Boolean);

export default function Reader({ darkMode, toggleDarkMode }) {
  const { bookId } = useParams(); const navigate = useNavigate(); const saveTimer = useRef();
  const [book, setBook] = useState(null); const [error, setError] = useState('');
  const [chapterIndex, setChapterIndex] = useState(0); const [paragraphIndex, setParagraphIndex] = useState(0);
  const [query, setQuery] = useState(''); const [selectedText, setSelectedText] = useState('');
  const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem('reader-font')) || 18);
  const [lineHeight, setLineHeight] = useState(() => Number(localStorage.getItem('reader-line')) || 1.8);
  const [voices, setVoices] = useState([]); const [voiceURI, setVoiceURI] = useState('');
  const [speechLanguage, setSpeechLanguage] = useState('en-US');
  const [rate, setRate] = useState(1); const [pitch, setPitch] = useState(1); const [volume, setVolume] = useState(1);
  const [speaking, setSpeaking] = useState(false); const [paused, setPaused] = useState(false); const [speechProgress, setSpeechProgress] = useState(0); const [autoNext, setAutoNext] = useState(false);
  const [summary, setSummary] = useState(null); const [summaryLoading, setSummaryLoading] = useState(false); const [summaryError, setSummaryError] = useState('');
  const chapters = book?.chapters || []; const chapter = chapters[chapterIndex]; const paragraphs = useMemo(() => paragraphsOf(chapter?.text), [chapter]);
  const chapterImages = useMemo(() => (book?.images || []).filter((image) => image.chapterId === chapter?._id).sort((a, b) => a.order - b.order), [book?.images, chapter?._id]);
  const speechVoices = useMemo(() => voicesForLanguage(voices, speechLanguage), [voices, speechLanguage]);
  const imagesAfterParagraph = useCallback((index) => chapterImages.filter((image) => Math.max(0, Math.min(paragraphs.length - 1, image.paragraphIndex || 0)) === index), [chapterImages, paragraphs.length]);

  useEffect(() => { API.get(`/documents/${bookId}/chapters`).then(({ data }) => { setBook(data); setChapterIndex(Math.min(data.progress?.chapterIndex || 0, data.chapters.length - 1)); setParagraphIndex(data.progress?.paragraphIndex || 0); }).catch((err) => setError(err.response?.data?.message || 'Could not load this book.')); }, [bookId]);
  useEffect(() => { if (isSpeechSupported()) loadVoices().then((items) => { setVoices(items); const english = voicesForLanguage(items, 'en-US'); setVoiceURI((current) => current || english[0]?.voiceURI || items[0]?.voiceURI || ''); }); }, []);
  useEffect(() => {
    if (!speechVoices.some((voice) => voice.voiceURI === voiceURI)) setVoiceURI(speechVoices[0]?.voiceURI || voices[0]?.voiceURI || '');
  }, [speechLanguage, speechVoices, voiceURI, voices]);
  useEffect(() => () => { speechController.stop(); clearTimeout(saveTimer.current); }, []);
  useEffect(() => { speechController.stop(); setSpeaking(false); setPaused(false); setSpeechProgress(0); setSummary(null); setSummaryError(''); }, [chapterIndex]);
  useEffect(() => { localStorage.setItem('reader-font', fontSize); localStorage.setItem('reader-line', lineHeight); }, [fontSize, lineHeight]);

  const savePosition = useCallback((nextParagraph = paragraphIndex) => {
    if (!book) return; clearTimeout(saveTimer.current);
    const percent = Math.round(((chapterIndex + Math.min(1, nextParagraph / Math.max(1, paragraphs.length))) / chapters.length) * 100);
    saveTimer.current = setTimeout(() => API.put(`/documents/${bookId}/progress`, { chapterIndex, paragraphIndex: nextParagraph, percent }).catch(() => {}), 400);
  }, [book, bookId, chapterIndex, paragraphIndex, paragraphs.length, chapters.length]);

  const changeChapter = (next) => { const index = Math.max(0, Math.min(chapters.length - 1, next)); setChapterIndex(index); setParagraphIndex(0); const percent = Math.round((index / Math.max(1, chapters.length)) * 100); API.put(`/documents/${bookId}/progress`, { chapterIndex: index, paragraphIndex: 0, percent }).catch(() => {}); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const play = () => {
    if (!isSpeechSupported()) return setError('This browser does not support the Web Speech API.');
    setSpeaking(true); setPaused(false);
    speechController.speakParagraphs(paragraphs, { rate, pitch, volume, lang: speechLocale(speechLanguage), voice: voices.find((v) => v.voiceURI === voiceURI), onProgress: ({ paragraphIndex: current, progress }) => { setParagraphIndex(current); setSpeechProgress(progress); savePosition(current); document.getElementById(`paragraph-${current}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }); }, onComplete: () => { setSpeaking(false); setSpeechProgress(100); if (autoNext && chapterIndex < chapters.length - 1) setTimeout(() => changeChapter(chapterIndex + 1), 250); }, onError: (message) => { setSpeaking(false); setError(`Speech stopped: ${message}`); } }, paragraphIndex);
  };
  const summarizeChapter = async () => {
    setSummaryLoading(true); setSummaryError('');
    try {
      const { data } = await API.post(`/documents/${bookId}/lessons`, { scope: 'chapter', chapterIndex, level: 'student' });
      setSummary(data.lesson);
    } catch (err) {
      setSummaryError(err.response?.data?.message || 'Could not summarize this chapter.');
    } finally {
      setSummaryLoading(false);
    }
  };
  const filtered = chapters.map((item, index) => ({ item, index })).filter(({ item }) => item.title.toLowerCase().includes(query.toLowerCase()));
  if (error && !book) return <div><Navbar darkMode={darkMode} toggleDarkMode={toggleDarkMode} /><main className="mx-auto max-w-3xl p-8"><p className="text-red-600">{error}</p><button className="btn-primary mt-4" onClick={() => navigate('/')}>Back to library</button></main></div>;
  if (!book) return <p className="p-10 text-center">Loading extracted chapters…</p>;
  return <div className="min-h-screen"><Navbar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
    <div className="mx-auto flex max-w-[1600px] flex-col lg:h-[calc(100vh-4rem)] lg:flex-row">
      <aside className="border-r border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900 lg:w-72 lg:overflow-y-auto"><h1 className="font-bold">{book.title}</h1><p className="mt-1 text-xs text-gray-500">{book.author || 'Author unavailable'}</p><input className="input mt-4" placeholder="Search chapters" value={query} onChange={(e) => setQuery(e.target.value)} /><nav className="mt-3 space-y-1">{filtered.map(({ item, index }) => <button key={item._id || index} onClick={() => changeChapter(index)} className={`w-full rounded p-2 text-left text-sm ${index === chapterIndex ? 'bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}><span className="block truncate">{item.number}. {item.title}</span><span className="text-xs text-gray-500">{item.wordCount?.toLocaleString()} words · {item.estimatedMinutes} min{item.pageStart ? ` · p. ${item.pageStart}${item.pageEnd && item.pageEnd !== item.pageStart ? `–${item.pageEnd}` : ''}` : ''}</span></button>)}</nav></aside>
      <main className="min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8" onMouseUp={() => setSelectedText(window.getSelection()?.toString().trim().slice(0, 5000) || '')}>
        <div className="mx-auto max-w-3xl"><div className="flex flex-wrap items-center gap-2 rounded-lg border bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
          <button className="btn-primary px-3 py-1" onClick={play} disabled={speaking}>Play</button><button className="btn-outline px-3 py-1" disabled={!speaking || paused} onClick={() => { speechController.pause(); setPaused(true); }}>Pause</button><button className="btn-outline px-3 py-1" disabled={!paused} onClick={() => { speechController.resume(); setPaused(false); }}>Resume</button><button className="btn-outline px-3 py-1" disabled={!speaking} onClick={() => { speechController.stop(); setSpeaking(false); }}>Stop</button><button className="btn-outline px-2 py-1" onClick={() => speechController.moveParagraph(-1)}>Previous paragraph</button><button className="btn-outline px-2 py-1" onClick={() => speechController.moveParagraph(1)}>Next paragraph</button>
          <select aria-label="Speech language" className="input max-w-36" value={speechLanguage} onChange={(e) => setSpeechLanguage(e.target.value)}><option value="en-US">English</option><option value="hi-IN">Hindi</option><option value="hinglish">Hinglish</option></select>
          <select aria-label="Voice" className="input max-w-44" value={voiceURI} onChange={(e) => setVoiceURI(e.target.value)}>{(speechVoices.length ? speechVoices : voices).map((voice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voice.name} ({voice.lang})</option>)}</select>
          <label className="text-xs">Speed <input type="range" min="0.5" max="2" step="0.1" value={rate} onChange={(e) => setRate(Number(e.target.value))} /></label><label className="text-xs">Pitch <input type="range" min="0" max="2" step="0.1" value={pitch} onChange={(e) => setPitch(Number(e.target.value))} /></label><label className="text-xs">Volume <input type="range" min="0" max="1" step="0.1" value={volume} onChange={(e) => setVolume(Number(e.target.value))} /></label><label className="text-xs"><input type="checkbox" checked={autoNext} onChange={(e) => setAutoNext(e.target.checked)} /> Auto-next</label>
          <div className="h-1.5 w-full rounded bg-gray-200 dark:bg-gray-700"><div className="h-1.5 rounded bg-brand-600" style={{ width: `${speechProgress}%` }} /></div>
        </div>
        <div className="mt-4 flex items-center justify-end gap-2 text-sm"><button className="btn-outline px-2 py-1" onClick={() => setFontSize((n) => Math.max(14, n - 1))}>A−</button><button className="btn-outline px-2 py-1" onClick={() => setFontSize((n) => Math.min(30, n + 1))}>A+</button><label>Spacing <select className="rounded border bg-transparent p-1" value={lineHeight} onChange={(e) => setLineHeight(Number(e.target.value))}><option value="1.5">Compact</option><option value="1.8">Comfortable</option><option value="2.1">Wide</option></select></label></div>
        <article className="mt-8"><p className="text-sm text-brand-600">Chapter {chapter.number}</p><div className="flex flex-wrap items-start justify-between gap-3"><h2 className="mt-1 text-3xl font-bold">{chapter.title}</h2><button className="btn-primary" onClick={summarizeChapter} disabled={summaryLoading}>{summaryLoading ? 'Summarizing…' : 'Summarize chapter'}</button></div>
          {summaryError && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{summaryError}</p>}
          {summary && <section className="mt-6 rounded-xl border border-brand-200 bg-brand-50 p-5 dark:border-brand-800 dark:bg-brand-950/30"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-semibold">Chapter summary</h3><button className="btn-outline px-3 py-1" onClick={() => speechController.speakParagraphs([summary.summary])}>Listen</button></div><p className="mt-3 leading-relaxed">{summary.summary}</p>{summary.keyIdeas?.length > 0 && <><h4 className="mt-4 text-sm font-semibold">Key ideas</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{summary.keyIdeas.map((idea, index) => <li key={index}>{idea}</li>)}</ul></>}{summary.importantImages?.length > 0 && <div className="mt-4"><h4 className="text-sm font-semibold">Important images</h4><ul className="mt-1 list-disc pl-5 text-sm">{summary.importantImages.map((item) => <li key={item.id}>{item.label}{item.pageNumber ? ` on page ${item.pageNumber}` : ''}{item.caption ? ` — ${item.caption}` : ''}</li>)}</ul></div>}{summary.citations?.length > 0 && <div className="mt-4 border-t border-brand-200 pt-3 dark:border-brand-800"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sources</p>{summary.citations.map((citation, index) => <p key={index} className="mt-1 text-xs text-gray-600 dark:text-gray-400">Chapter {citation.chapterNumber}{citation.page ? `, page ${citation.page}` : ''}: {citation.excerpt}</p>)}</div>}</section>}
          <div className="mt-7" style={{ fontSize, lineHeight }}>{paragraphs.map((paragraph, index) => <div key={index}><p id={`paragraph-${index}`} onClick={() => { setParagraphIndex(index); savePosition(index); }} className={`mb-5 rounded px-1 transition-colors ${index === paragraphIndex && speaking ? 'bg-yellow-100 dark:bg-yellow-900/40' : ''}`}>{paragraph}</p>{imagesAfterParagraph(index).map((image) => <ChapterImage key={image.id} image={image} />)}</div>)}</div></article>
        <div className="my-8 flex justify-between"><button className="btn-outline" disabled={!chapterIndex} onClick={() => changeChapter(chapterIndex - 1)}>Previous chapter</button><button className="btn-primary" disabled={chapterIndex === chapters.length - 1} onClick={() => changeChapter(chapterIndex + 1)}>Next chapter</button></div></div>
      </main>
      <TutorPanel bookId={bookId} chapterIndex={chapterIndex} selectedText={selectedText} onOpenChapter={changeChapter} />
    </div>
  </div>;
}
