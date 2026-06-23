import { Link } from 'react-router-dom';

export default function Navbar({ darkMode, toggleDarkMode }) {
  return <nav className="border-b border-gray-200 bg-white/90 backdrop-blur dark:border-gray-800 dark:bg-gray-950/90">
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
      <Link to="/" className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 font-bold text-white">V</span>
        <span className="text-lg font-semibold">VoiceDoc Tutor</span>
      </Link>
      <div className="flex items-center gap-3">
        <Link to="/" className="btn-outline px-3 py-1.5">Library</Link>
        <button type="button" onClick={toggleDarkMode} className="btn-outline px-3 py-1.5" aria-label="Toggle color mode">{darkMode ? 'Light' : 'Dark'}</button>
      </div>
    </div>
  </nav>;
}
