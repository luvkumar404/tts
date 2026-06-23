import { useRef, useState } from 'react';
import API from '../api/axios';

const ACCEPTED = '.pdf,.epub,.docx,.txt';

export default function DocumentUpload({ onComplete }) {
  const input = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [stage, setStage] = useState('idle');
  const [uploadPercent, setUploadPercent] = useState(0);
  const [error, setError] = useState('');

  const validate = (file) => {
    if (!file || file.size === 0) return 'The selected file is empty.';
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'epub', 'docx', 'txt'].includes(extension)) return 'Upload a PDF, EPUB, DOCX, or TXT file.';
    return '';
  };
  const upload = async (file) => {
    const problem = validate(file);
    if (problem) return setError(problem);
    setError(''); setStage('uploading'); setUploadPercent(0);
    const body = new FormData(); body.append('document', file);
    try {
      const { data } = await API.post('/documents/upload', body, {
        onUploadProgress: ({ loaded, total }) => {
          if (total) setUploadPercent(Math.round((loaded / total) * 100));
          if (total && loaded >= total) setStage('extracting');
        },
      });
      setStage('complete'); onComplete?.(data);
    } catch (err) { setError(err.response?.data?.message || 'Upload or extraction failed.'); setStage('idle'); }
    finally { if (input.current) input.current.value = ''; }
  };
  return <div className="card">
    <h2 className="text-lg font-semibold">Upload a book</h2>
    <p className="mt-1 text-sm text-gray-500">Files are extracted into real chapters; temporary uploads are deleted after processing.</p>
    <div className={`mt-5 rounded-xl border-2 border-dashed p-10 text-center ${dragOver ? 'border-brand-500 bg-brand-50 dark:bg-brand-950' : 'border-gray-300 dark:border-gray-700'}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={(e) => { e.preventDefault(); setDragOver(false); upload(e.dataTransfer.files?.[0]); }}>
      <p className="font-medium">Drag and drop a book here</p>
      <p className="mt-1 text-xs text-gray-500">PDF, EPUB, DOCX, or TXT</p>
      <input ref={input} id="book-upload" type="file" accept={ACCEPTED} className="hidden" disabled={stage === 'uploading' || stage === 'extracting'} onChange={(e) => upload(e.target.files?.[0])} />
      <label htmlFor="book-upload" className="btn-primary mt-4 cursor-pointer">Choose file</label>
    </div>
    {stage === 'uploading' && <div className="mt-4" aria-live="polite"><div className="flex justify-between text-sm"><span>Uploading</span><span>{uploadPercent}%</span></div><div className="mt-1 h-2 rounded bg-gray-200"><div className="h-2 rounded bg-brand-600" style={{ width: `${uploadPercent}%` }} /></div></div>}
    {stage === 'extracting' && <p className="mt-4 text-sm text-brand-600" aria-live="polite">Upload complete. Extracting metadata and chapters…</p>}
    {stage === 'complete' && <p className="mt-4 text-sm text-green-700">Chapter processing complete.</p>}
    {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300" role="alert">{error}</p>}
  </div>;
}
