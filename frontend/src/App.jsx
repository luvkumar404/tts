import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Dashboard from './pages/Dashboard';
import Reader from './pages/Reader';

export default function App() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);
  const shared = { darkMode, toggleDarkMode: () => setDarkMode((value) => !value) };
  return <Routes>
    <Route path="/" element={<Dashboard {...shared} />} />
    <Route path="/dashboard" element={<Navigate to="/" replace />} />
    <Route path="/reader/:bookId" element={<Reader {...shared} />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
