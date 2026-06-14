import { Link, useNavigate } from 'react-router-dom';

export default function Navbar({ darkMode, toggleDarkMode }) {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="border-b border-gray-200 bg-white/80 backdrop-blur dark:border-gray-800 dark:bg-gray-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to={token ? '/dashboard' : '/'} className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            V
          </span>
          <span className="text-lg font-semibold">VoiceDoc TTS</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleDarkMode}
            className="btn-outline px-3 py-1.5"
            aria-label="Toggle dark mode"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>

          {token ? (
            <>
              <span className="hidden text-sm text-gray-600 dark:text-gray-400 sm:inline">
                Hi, {user?.name?.split(' ')[0]}
              </span>
              <button type="button" onClick={handleLogout} className="btn-outline px-3 py-1.5">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-outline px-3 py-1.5">
                Login
              </Link>
              <Link to="/register" className="btn-primary px-3 py-1.5">
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
