import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function Landing({ darkMode, toggleDarkMode }) {
  return (
    <div className="min-h-screen">
      <Navbar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 py-20 text-center sm:py-28">
          <span className="mb-4 inline-block rounded-full bg-brand-100 px-4 py-1 text-sm font-medium text-brand-700 dark:bg-brand-900/50 dark:text-brand-300">
            Free browser-based TTS
          </span>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Turn documents into{' '}
            <span className="text-brand-600 dark:text-brand-400">spoken words</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
            VoiceDoc TTS lets you paste text or upload PDF, DOCX, and TXT files, then listen
            using your browser&apos;s built-in Web Speech API. No API keys required.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/register" className="btn-primary px-8 py-3 text-base">
              Get started free
            </Link>
            <Link to="/login" className="btn-outline px-8 py-3 text-base">
              Sign in
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-gray-200 bg-white py-20 dark:border-gray-800 dark:bg-gray-900/50">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-center text-3xl font-bold">Everything you need</h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-gray-600 dark:text-gray-400">
              A complete document-to-speech workflow powered entirely by your browser.
            </p>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: 'Document upload',
                  desc: 'Upload PDF, DOCX, or TXT files up to 10MB. Text is extracted on the server.',
                  icon: '📄',
                },
                {
                  title: 'Browser voices',
                  desc: 'Choose from system voices, adjust rate, pitch, and volume — no cloud TTS needed.',
                  icon: '🔊',
                },
                {
                  title: 'Document history',
                  desc: 'Save and revisit your uploaded documents anytime from your dashboard.',
                  icon: '📚',
                },
                {
                  title: 'Chunked playback',
                  desc: 'Long documents are split into chunks for smooth, crash-free speech.',
                  icon: '⚡',
                },
                {
                  title: 'Playback controls',
                  desc: 'Speak, pause, resume, and stop with full control over your listening session.',
                  icon: '⏯️',
                },
                {
                  title: 'Secure & private',
                  desc: 'JWT authentication keeps your documents private. Speech runs locally in your browser.',
                  icon: '🔒',
                },
              ].map((feature) => (
                <div key={feature.title} className="card">
                  <div className="text-3xl">{feature.icon}</div>
                  <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-3xl font-bold">Ready to listen?</h2>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Create a free account and start converting your documents to speech in seconds.
            </p>
            <Link to="/register" className="btn-primary mt-8 inline-flex px-8 py-3 text-base">
              Create account
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-200 py-8 text-center text-sm text-gray-500 dark:border-gray-800">
        © {new Date().getFullYear()} VoiceDoc TTS. Built with Web Speech API.
      </footer>
    </div>
  );
}
