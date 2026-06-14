import { useEffect, useState } from 'react';
import { isSpeechSupported, loadVoices } from '../utils/speech';

const LANGUAGES = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'es-ES', label: 'Spanish' },
  { code: 'fr-FR', label: 'French' },
  { code: 'de-DE', label: 'German' },
  { code: 'it-IT', label: 'Italian' },
  { code: 'pt-BR', label: 'Portuguese (Brazil)' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'ja-JP', label: 'Japanese' },
  { code: 'zh-CN', label: 'Chinese (Mandarin)' },
];

export default function VoiceControls({
  rate,
  pitch,
  volume,
  lang,
  selectedVoiceURI,
  onRateChange,
  onPitchChange,
  onVolumeChange,
  onLangChange,
  onVoiceChange,
  onSpeak,
  onPause,
  onResume,
  onStop,
  isSpeaking,
  isPaused,
  progress,
  canSpeak,
}) {
  const [voices, setVoices] = useState([]);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const ok = isSpeechSupported();
    setSupported(ok);
    if (!ok) return;

    loadVoices().then(setVoices);
  }, []);

  const filteredVoices = voices.filter((v) => v.lang.startsWith(lang.split('-')[0]));

  const displayVoices = filteredVoices.length > 0 ? filteredVoices : voices;

  return (
    <div className="card">
      <h2 className="mb-4 text-lg font-semibold">Voice controls</h2>

      {!supported && (
        <div className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          ⚠️ Your browser does not support the Web Speech API. TTS features will not work.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="language" className="label">
            Language
          </label>
          <select
            id="language"
            className="input"
            value={lang}
            onChange={(e) => onLangChange(e.target.value)}
            disabled={!supported}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="voice" className="label">
            Voice ({displayVoices.length} available)
          </label>
          <select
            id="voice"
            className="input"
            value={selectedVoiceURI}
            onChange={(e) => onVoiceChange(e.target.value)}
            disabled={!supported || displayVoices.length === 0}
          >
            {displayVoices.length === 0 ? (
              <option value="">No voices available</option>
            ) : (
              displayVoices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label htmlFor="rate" className="label">
            Speed: {rate.toFixed(1)}x
          </label>
          <input
            id="rate"
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={rate}
            onChange={(e) => onRateChange(parseFloat(e.target.value))}
            className="w-full accent-brand-600"
            disabled={!supported}
          />
        </div>

        <div>
          <label htmlFor="pitch" className="label">
            Pitch: {pitch.toFixed(1)}
          </label>
          <input
            id="pitch"
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={pitch}
            onChange={(e) => onPitchChange(parseFloat(e.target.value))}
            className="w-full accent-brand-600"
            disabled={!supported}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="volume" className="label">
            Volume: {Math.round(volume * 100)}%
          </label>
          <input
            id="volume"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="w-full accent-brand-600"
            disabled={!supported}
          />
        </div>
      </div>

      {/* Progress bar */}
      {isSpeaking && progress.totalChunks > 0 && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              Chunk {progress.currentChunk} of {progress.totalChunks}
            </span>
            <span>{Math.round(progress.progress)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-brand-600 transition-all duration-300"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Playback buttons */}
      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSpeak}
          disabled={!supported || !canSpeak || isSpeaking}
          className="btn-primary"
        >
          ▶ Speak
        </button>
        <button
          type="button"
          onClick={onPause}
          disabled={!supported || !isSpeaking || isPaused}
          className="btn-secondary"
        >
          ⏸ Pause
        </button>
        <button
          type="button"
          onClick={onResume}
          disabled={!supported || !isPaused}
          className="btn-secondary"
        >
          ⏵ Resume
        </button>
        <button
          type="button"
          onClick={onStop}
          disabled={!supported || !isSpeaking}
          className="btn-danger"
        >
          ⏹ Stop
        </button>
      </div>
    </div>
  );
}
