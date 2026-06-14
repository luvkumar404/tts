import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import TextEditor from '../components/TextEditor';
import DocumentUpload from '../components/DocumentUpload';
import VoiceControls from '../components/VoiceControls';
import DocumentHistory from '../components/DocumentHistory';
import { speechController, loadVoices, isSpeechSupported } from '../utils/speech';
import API from '../api/axios';

export default function Dashboard({ darkMode, toggleDarkMode }) {
  const [text, setText] = useState('');
  const [highlightText, setHighlightText] = useState('');
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [volume, setVolume] = useState(1);
  const [lang, setLang] = useState('en-US');
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('');
  const [voices, setVoices] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState({ currentChunk: 0, totalChunks: 0, progress: 0 });
  const [historyRefresh, setHistoryRefresh] = useState(0);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (isSpeechSupported()) {
      loadVoices().then((v) => {
        setVoices(v);
        const defaultVoice = v.find((voice) => voice.lang === 'en-US') || v[0];
        if (defaultVoice) setSelectedVoiceURI(defaultVoice.voiceURI);
      });
    }
  }, []);

  const getSelectedVoice = useCallback(() => {
    return voices.find((v) => v.voiceURI === selectedVoiceURI) || null;
  }, [voices, selectedVoiceURI]);

  const handleSpeak = () => {
    if (!text.trim()) return;

    setIsSpeaking(true);
    setIsPaused(false);
    setHighlightText('');

    speechController.speak(text, {
      rate,
      pitch,
      volume,
      lang,
      voice: getSelectedVoice(),
      onProgress: ({ chunkText, currentChunk, totalChunks, progress: pct }) => {
        setHighlightText(chunkText);
        setProgress({ currentChunk, totalChunks, progress: pct });
      },
      onComplete: () => {
        setIsSpeaking(false);
        setIsPaused(false);
        setHighlightText('');
        setProgress({ currentChunk: 0, totalChunks: 0, progress: 0 });
      },
      onError: () => {
        setIsSpeaking(false);
        setIsPaused(false);
      },
    });
  };

  const handlePause = () => {
    speechController.pause();
    setIsPaused(true);
  };

  const handleResume = () => {
    speechController.resume();
    setIsPaused(false);
  };

  const handleStop = () => {
    speechController.stop();
    setIsSpeaking(false);
    setIsPaused(false);
    setHighlightText('');
    setProgress({ currentChunk: 0, totalChunks: 0, progress: 0 });
  };

  const handleSaveDocument = async () => {
    if (!text.trim()) {
      setSaveError('Nothing to save. Add or paste some text first.');
      return;
    }

    setSaveLoading(true);
    setSaveError('');
    setSaveMessage('');

    // Save as a TXT file via the existing upload endpoint
    const filename = `saved-text-${Date.now()}.txt`;
    const blob = new Blob([text], { type: 'text/plain' });
    const file = new File([blob], filename, { type: 'text/plain' });
    const formData = new FormData();
    formData.append('document', file);

    try {
      await API.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSaveMessage('Document saved to history!');
      setHistoryRefresh((n) => n + 1);
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (err) {
      setSaveError(err.response?.data?.message || 'Failed to save document');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDocumentSaved = () => {
    setHistoryRefresh((n) => n + 1);
  };

  const handleSelectDocument = (doc) => {
    setText(doc.extractedText);
    handleStop();
  };

  return (
    <div className="min-h-screen">
      <Navbar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Paste text or upload a document, then listen with your browser&apos;s voice engine.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <TextEditor text={text} onChange={setText} highlightText={highlightText} />
            <DocumentUpload
              onTextExtracted={setText}
              onDocumentSaved={handleDocumentSaved}
            />
            <VoiceControls
              rate={rate}
              pitch={pitch}
              volume={volume}
              lang={lang}
              selectedVoiceURI={selectedVoiceURI}
              onRateChange={setRate}
              onPitchChange={setPitch}
              onVolumeChange={setVolume}
              onLangChange={setLang}
              onVoiceChange={setSelectedVoiceURI}
              onSpeak={handleSpeak}
              onPause={handlePause}
              onResume={handleResume}
              onStop={handleStop}
              isSpeaking={isSpeaking}
              isPaused={isPaused}
              progress={progress}
              canSpeak={text.trim().length > 0}
            />

            {/* Save document */}
            <div className="card">
              <h2 className="mb-2 text-lg font-semibold">Save to history</h2>
              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                Save the current text content to your document history.
              </p>
              {saveMessage && (
                <div className="mb-3 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
                  {saveMessage}
                </div>
              )}
              {saveError && (
                <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  {saveError}
                </div>
              )}
              <button
                type="button"
                onClick={handleSaveDocument}
                disabled={saveLoading || !text.trim()}
                className="btn-primary"
              >
                {saveLoading ? 'Saving...' : '💾 Save document'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-1">
            <DocumentHistory
              onSelectDocument={handleSelectDocument}
              refreshTrigger={historyRefresh}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
