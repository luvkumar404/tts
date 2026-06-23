import { useEffect, useState } from 'react';
import API from '../api/axios';
import { speechController } from '../utils/speech';

export default function ChapterImage({ image }) {
  const [source, setSource] = useState('');
  const [failed, setFailed] = useState(false);
  const [preview, setPreview] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [explanation, setExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);
  const route = image.imageUrl.replace(/^\/api/, '');

  useEffect(() => {
    let objectUrl = '';
    let active = true;
    setFailed(false); setSource('');
    API.get(route, { responseType: 'blob' }).then(({ data }) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(data); setSource(objectUrl);
    }).catch(() => active && setFailed(true));
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [route]);

  const explain = async () => {
    setExplaining(true);
    try { setExplanation((await API.post(`${route}/explain`)).data); }
    catch (error) { setExplanation({ explanation: error.response?.data?.message || 'This image could not be explained.', unclear: true }); }
    finally { setExplaining(false); }
  };

  return <figure className="my-7 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
    {!source && !failed && <div className="flex aspect-video animate-pulse items-center justify-center bg-gray-100 text-sm text-gray-500 dark:bg-gray-800">Loading book image…</div>}
    {failed && <div className="flex aspect-video items-center justify-center bg-red-50 p-6 text-center text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">This book image could not be loaded.</div>}
    {source && <button type="button" onClick={() => { setPreview(true); setZoom(1); }} className="block w-full bg-gray-50 dark:bg-gray-950" aria-label={`Open ${image.label || 'book image'} full size`}><img src={source} alt={image.caption || image.label || 'Book illustration'} width={image.width} height={image.height} className="mx-auto h-auto max-h-[70vh] max-w-full object-contain" onError={() => setFailed(true)} /></button>}
    <figcaption className="p-4"><p className="text-sm font-medium">{image.label || `Figure ${image.order + 1}`}{image.pageNumber ? ` · Page ${image.pageNumber}` : ''}</p>{image.caption && <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{image.caption}</p>}{image.scannedPage && <p className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">This is a scanned page. Text extraction is unavailable, but you can still view the page.</p>}<div className="mt-3 flex flex-wrap gap-2"><button className="btn-primary px-3 py-1" onClick={explain} disabled={explaining}>{explaining ? 'Explaining…' : 'Explain this image'}</button>{image.caption && <button className="btn-outline px-3 py-1" onClick={() => speechController.speakParagraphs([image.caption])}>Listen to caption</button>}</div>
      {explanation && <div className={`mt-3 rounded-lg p-3 text-sm ${explanation.unclear ? 'bg-amber-50 dark:bg-amber-950/30' : 'bg-brand-50 dark:bg-brand-950/30'}`}><p>{explanation.explanation}</p><button className="btn-outline mt-2 px-3 py-1" onClick={() => speechController.speakParagraphs([explanation.explanation])}>Listen to explanation</button></div>}
    </figcaption>
    {preview && source && <div className="fixed inset-0 z-50 flex flex-col bg-black/90 p-4" role="dialog" aria-modal="true" aria-label="Full-size image preview"><div className="flex justify-end gap-2"><button className="btn-secondary" onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}>Zoom out</button><span className="rounded bg-white px-3 py-2 text-sm text-black">{Math.round(zoom * 100)}%</span><button className="btn-secondary" onClick={() => setZoom((value) => Math.min(4, value + 0.25))}>Zoom in</button><button className="btn-danger" onClick={() => setPreview(false)}>Close</button></div><div className="mt-4 flex-1 overflow-auto text-center"><img src={source} alt={image.caption || image.label || 'Book illustration'} className="mx-auto h-auto max-w-none object-contain transition-transform" style={{ width: `${Math.max(10, zoom * 100)}%` }} /></div></div>}
  </figure>;
}
