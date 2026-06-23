import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import DocumentUpload from '../components/DocumentUpload';
import DocumentHistory from '../components/DocumentHistory';

export default function Dashboard({ darkMode, toggleDarkMode }) {
  const navigate = useNavigate();
  const [refresh, setRefresh] = useState(0);
  return <div className="min-h-screen">
    <Navbar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
    <main className="mx-auto max-w-6xl px-4 py-10">
      <header className="mb-8"><h1 className="text-3xl font-bold">Read, listen, and learn from any book</h1><p className="mt-2 max-w-3xl text-gray-600 dark:text-gray-400">Upload a document, review its detected chapters, listen using your browser voice, and use the tutor grounded in the extracted text.</p></header>
      <DocumentUpload onComplete={(book) => { setRefresh((n) => n + 1); navigate(`/reader/${book._id}`); }} />
      <div className="mt-6"><DocumentHistory refreshTrigger={refresh} /></div>
    </main>
  </div>;
}
