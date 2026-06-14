import { useRef, useState } from 'react';
import API from '../api/axios';

const ACCEPTED = '.pdf,.docx,.txt';

export default function DocumentUpload({ onTextExtracted, onDocumentSaved }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const validateFile = (file) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['pdf', 'docx', 'txt'].includes(ext)) {
      return 'Unsupported file type. Only PDF, DOCX, and TXT are allowed.';
    }
    if (file.size > 10 * 1024 * 1024) {
      return 'File too large. Maximum size is 10MB.';
    }
    return null;
  };

  const uploadFile = async (file) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('document', file);

    try {
      const { data } = await API.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onTextExtracted(data.extractedText);
      onDocumentSaved?.(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  return (
    <div className="card">
      <h2 className="mb-4 text-lg font-semibold">Upload document</h2>

      <div
        className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragOver
            ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20'
            : 'border-gray-300 dark:border-gray-700'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="text-4xl">📁</div>
        <p className="mt-3 text-sm font-medium">Drag & drop a file here</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          PDF, DOCX, or TXT — max 10MB
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED}
          onChange={handleFileChange}
          className="hidden"
          id="file-upload"
          disabled={uploading}
        />
        <label
          htmlFor="file-upload"
          className={`btn-primary mt-4 inline-flex cursor-pointer ${uploading ? 'pointer-events-none opacity-50' : ''}`}
        >
          {uploading ? 'Extracting text...' : 'Choose file'}
        </label>
      </div>

      {uploading && (
        <div className="mt-4 flex items-center gap-2 text-sm text-brand-600 dark:text-brand-400">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          Uploading and extracting text...
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
