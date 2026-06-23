import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axios';

export default function DocumentHistory({ refreshTrigger }) {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    try { setBooks((await API.get('/documents')).data); }
    catch (err) { setError(err.response?.data?.message || 'Could not load your library.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [refreshTrigger]);
  const remove = async (event, id) => {
    event.stopPropagation();
    if (!window.confirm('Delete this extracted book?')) return;
    try { await API.delete(`/documents/${id}`); setBooks((items) => items.filter((book) => book._id !== id)); }
    catch (err) { setError(err.response?.data?.message || 'Delete failed.'); }
  };
  return <div className="card">
    <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Your book history</h2><button className="btn-outline px-3 py-1" onClick={load}>Refresh</button></div>
    {loading && <p className="py-8 text-sm text-gray-500">Loading books…</p>}
    {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    {!loading && !books.length && <p className="py-10 text-center text-sm text-gray-500">No uploaded books in this browser yet.</p>}
    <div className="mt-4 grid gap-3 md:grid-cols-2">
      {books.map((book) => <div key={book._id} className="rounded-lg border border-gray-200 p-4 text-left hover:border-brand-500 dark:border-gray-700">
        <div className="flex justify-between gap-3"><button onClick={() => navigate(`/reader/${book._id}`)} className="min-w-0 flex-1 text-left"><p className="truncate font-medium">{book.title}</p><p className="mt-1 text-xs text-gray-500">{book.author || 'Author unavailable'} · {book.fileType.toUpperCase()} · {book.chapters?.length || 0} chapters</p></button><button className="text-xs text-red-600" onClick={(e) => remove(e, book._id)}>Delete</button></div>
        <div className="mt-3 h-1.5 rounded bg-gray-200 dark:bg-gray-700"><div className="h-1.5 rounded bg-brand-600" style={{ width: `${book.progress?.percent || 0}%` }} /></div>
      </div>)}
    </div>
  </div>;
}
