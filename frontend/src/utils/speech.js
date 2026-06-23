const CHUNK_SIZE = 220;
export const isSpeechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;

export const splitIntoChunks = (text, maxLength = CHUNK_SIZE) => {
  if (!text?.trim()) return [];
  const sentences = text.trim().match(/[^.!?]+[.!?]+(?:["'”’)]*)|[^.!?]+$/g) || [text.trim()];
  const chunks = [];
  let current = '';
  const pushWords = (sentence) => {
    let rest = sentence.trim();
    while (rest.length > maxLength) {
      let index = rest.lastIndexOf(' ', maxLength);
      if (index < maxLength * 0.5) index = maxLength;
      chunks.push(rest.slice(0, index).trim()); rest = rest.slice(index).trim();
    }
    return rest;
  };
  sentences.forEach((sentence) => {
    const clean = sentence.trim();
    if (`${current} ${clean}`.trim().length <= maxLength) current = `${current} ${clean}`.trim();
    else { if (current) chunks.push(current); current = clean.length > maxLength ? pushWords(clean) : clean; }
  });
  if (current) chunks.push(current);
  return chunks.filter(Boolean);
};

export const loadVoices = () => new Promise((resolve) => {
  if (!isSpeechSupported()) return resolve([]);
  const synth = window.speechSynthesis;
  const available = synth.getVoices();
  if (available.length) return resolve(available);
  const done = () => { synth.removeEventListener('voiceschanged', done); resolve(synth.getVoices()); };
  synth.addEventListener('voiceschanged', done);
  setTimeout(done, 1500);
});

export const speechLocale = (language) => language === 'hinglish' ? 'hi-IN' : language;

export const voicesForLanguage = (voices, language) => {
  if (language === 'hinglish') {
    const hindi = voices.filter((voice) => voice.lang.toLowerCase().startsWith('hi'));
    const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'));
    return [...hindi, ...english];
  }
  const prefix = speechLocale(language).split('-')[0].toLowerCase();
  return voices.filter((voice) => voice.lang.toLowerCase().startsWith(prefix));
};

export class SpeechController {
  constructor() { this.stop(false); }
  speakParagraphs(paragraphs, options = {}, startParagraph = 0) {
    this.stop(); this.options = options; this.cancelled = false; this.paused = false; this.speaking = true;
    this.items = paragraphs.flatMap((paragraph, paragraphIndex) => splitIntoChunks(paragraph).map((text) => ({ text, paragraphIndex })));
    this.index = Math.max(0, this.items.findIndex((item) => item.paragraphIndex >= startParagraph));
    if (!this.items.length) { this.speaking = false; return; }
    this.speakCurrent();
  }
  speakCurrent() {
    if (this.cancelled) return;
    if (this.index >= this.items.length) { this.speaking = false; this.options.onComplete?.(); return; }
    const item = this.items[this.index];
    const utterance = new SpeechSynthesisUtterance(item.text);
    Object.assign(utterance, { rate: this.options.rate ?? 1, pitch: this.options.pitch ?? 1, volume: this.options.volume ?? 1 });
    if (this.options.lang) utterance.lang = speechLocale(this.options.lang);
    if (this.options.voice) utterance.voice = this.options.voice;
    utterance.onstart = () => this.options.onProgress?.({ paragraphIndex: item.paragraphIndex, chunkIndex: this.index, totalChunks: this.items.length, progress: ((this.index + 1) / this.items.length) * 100 });
    utterance.onend = () => { if (!this.cancelled) { this.index += 1; this.speakCurrent(); } };
    utterance.onerror = (event) => { if (!['interrupted', 'canceled'].includes(event.error)) { this.speaking = false; this.options.onError?.(event.error); } };
    window.speechSynthesis.speak(utterance);
  }
  pause() { if (this.speaking && !this.paused) { window.speechSynthesis.pause(); this.paused = true; } }
  resume() { if (this.speaking && this.paused) { window.speechSynthesis.resume(); this.paused = false; } }
  moveParagraph(delta) {
    if (!this.items?.length) return;
    const current = this.items[this.index]?.paragraphIndex || 0;
    const target = Math.max(0, current + delta);
    const found = this.items.findIndex((item) => item.paragraphIndex === target);
    if (found >= 0) { window.speechSynthesis.cancel(); this.index = found; this.cancelled = false; setTimeout(() => this.speakCurrent(), 0); }
  }
  stop(cancelBrowser = true) { this.cancelled = true; this.paused = false; this.speaking = false; this.items = []; this.index = 0; this.options = {}; if (cancelBrowser && isSpeechSupported()) window.speechSynthesis.cancel(); }
}

export const speechController = new SpeechController();
