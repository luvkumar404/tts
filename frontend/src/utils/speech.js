/**
 * Web Speech API utility with chunking for long documents.
 * Uses browser's built-in speechSynthesis — no external TTS APIs.
 */

const CHUNK_SIZE = 250;

export const isSpeechSupported = () =>
  typeof window !== 'undefined' && 'speechSynthesis' in window;

/**
 * Split text into speakable chunks at sentence/word boundaries.
 */
export const splitIntoChunks = (text) => {
  if (!text || !text.trim()) return [];

  const chunks = [];
  let remaining = text.trim();

  while (remaining.length > 0) {
    if (remaining.length <= CHUNK_SIZE) {
      chunks.push(remaining);
      break;
    }

    let splitIndex = CHUNK_SIZE;
    const slice = remaining.slice(0, CHUNK_SIZE);

    const sentenceMatch = slice.match(/.*[.!?]\s/s);
    if (sentenceMatch) {
      splitIndex = sentenceMatch[0].length;
    } else {
      const lastSpace = slice.lastIndexOf(' ');
      if (lastSpace > CHUNK_SIZE * 0.5) {
        splitIndex = lastSpace + 1;
      }
    }

    chunks.push(remaining.slice(0, splitIndex).trim());
    remaining = remaining.slice(splitIndex).trim();
  }

  return chunks.filter(Boolean);
};

/**
 * Load available voices (handles async voice loading in Chrome).
 */
export const loadVoices = () =>
  new Promise((resolve) => {
    const synth = window.speechSynthesis;
    let voices = synth.getVoices();

    if (voices.length > 0) {
      resolve(voices);
      return;
    }

    const onVoicesChanged = () => {
      voices = synth.getVoices();
      if (voices.length > 0) {
        synth.removeEventListener('voiceschanged', onVoicesChanged);
        resolve(voices);
      }
    };

    synth.addEventListener('voiceschanged', onVoicesChanged);

    setTimeout(() => {
      synth.removeEventListener('voiceschanged', onVoicesChanged);
      resolve(synth.getVoices());
    }, 1000);
  });

/**
 * Speech controller class for chunked TTS with pause/resume/stop.
 */
export class SpeechController {
  constructor() {
    this.chunks = [];
    this.currentIndex = 0;
    this.isPaused = false;
    this.isSpeaking = false;
    this.options = {};
    this.onProgress = null;
    this.onComplete = null;
    this.onError = null;
    this._cancelled = false;
  }

  speak(text, options = {}) {
    this.stop();
    this.chunks = splitIntoChunks(text);
    this.currentIndex = 0;
    this.isPaused = false;
    this.isSpeaking = true;
    this._cancelled = false;
    this.options = options;
    this.onProgress = options.onProgress;
    this.onComplete = options.onComplete;
    this.onError = options.onError;

    if (this.chunks.length === 0) {
      this.isSpeaking = false;
      return;
    }

    this._speakCurrentChunk();
  }

  _speakCurrentChunk() {
    if (this._cancelled || this.currentIndex >= this.chunks.length) {
      this.isSpeaking = false;
      this.onComplete?.();
      return;
    }

    const chunk = this.chunks[this.currentIndex];
    const utterance = new SpeechSynthesisUtterance(chunk);

    utterance.rate = this.options.rate ?? 1;
    utterance.pitch = this.options.pitch ?? 1;
    utterance.volume = this.options.volume ?? 1;
    utterance.lang = this.options.lang ?? 'en-US';

    if (this.options.voice) {
      utterance.voice = this.options.voice;
    }

    utterance.onstart = () => {
      this.onProgress?.({
        currentChunk: this.currentIndex + 1,
        totalChunks: this.chunks.length,
        chunkText: chunk,
        progress: ((this.currentIndex + 1) / this.chunks.length) * 100,
      });
    };

    utterance.onend = () => {
      if (this._cancelled || this.isPaused) return;
      this.currentIndex += 1;
      this._speakCurrentChunk();
    };

    utterance.onerror = (event) => {
      if (event.error === 'interrupted' || event.error === 'canceled') return;
      this.isSpeaking = false;
      this.onError?.(event.error);
    };

    window.speechSynthesis.speak(utterance);
  }

  pause() {
    if (!this.isSpeaking || this.isPaused) return;
    window.speechSynthesis.pause();
    this.isPaused = true;
  }

  resume() {
    if (!this.isSpeaking || !this.isPaused) return;
    window.speechSynthesis.resume();
    this.isPaused = false;
  }

  stop() {
    this._cancelled = true;
    this.isSpeaking = false;
    this.isPaused = false;
    window.speechSynthesis.cancel();
  }

  getState() {
    return {
      isSpeaking: this.isSpeaking,
      isPaused: this.isPaused,
      currentIndex: this.currentIndex,
      totalChunks: this.chunks.length,
    };
  }
}

export const speechController = new SpeechController();
