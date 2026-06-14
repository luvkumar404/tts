import { useEffect, useState } from 'react';
import API from '../api/axios';

export default function DocumentHistory({ onSelectDocument, refreshTrigger }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const fetchDocuments = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await API.get('/documents');
      setDocuments(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [refreshTrigger]);

  const handleSelect = async (id) => {
    try {
      const { data } = await API.get(`/documents/${id}`);
      onSelectDocument(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load document');
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this document from history?')) return;

    setDeletingId(id);
    try {
      await API.delete(`/documents/${id}`);
      setDocuments((prev) => prev.filter((d) => d._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const fileIcon = (type) => {
    switch (type) {
      case 'pdf':
        return '📕';
      case 'docx':
        return '📘';
      default:
        return '📝';
    }
  };

  return (
    <div className="card">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Document history</h2>
        <button type="button" onClick={fetchDocuments} className="btn-outline px-3 py-1 text-xs">
          Refresh
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          Loading documents...
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && documents.length === 0 && (
        <div className="py-12 text-center">
          <div className="text-4xl">📭</div>
          <p className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-400">
            No documents yet
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Upload a document or save text to see it here
          </p>
        </div>
      )}

      {!loading && documents.length > 0 && (
        <ul className="divide-y divide-gray-200 dark:divide-gray-800">
          {documents.map((doc) => (
            <li key={doc._id}>
              <button
                type="button"
                onClick={() => handleSelect(doc._id)}
                className="flex w-full items-center gap-3 px-2 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <span className="text-2xl">{fileIcon(doc.fileType)}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{doc.originalFilename}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {doc.fileType.toUpperCase()} · {formatDate(doc.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => handleDelete(e, doc._id)}
                  disabled={deletingId === doc._id}
                  className="btn-outline shrink-0 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  {deletingId === doc._id ? '...' : 'Delete'}
                </button>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
