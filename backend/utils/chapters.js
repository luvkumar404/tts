const HEADING = /^(?:(?:chapter|book|part|section)\s+(?:\d+|[ivxlcdm]+|[a-z]+)(?:\s*[:.\-–—]\s*|\s+).+|(?:chapter|book|part)\s+(?:\d+|[ivxlcdm]+|[a-z]+)|\d+(?:\.\d+)*[.)]?\s+[A-Z][^.!?]{2,90}|[A-Z][A-Z\s'’:\-–—]{4,80})$/i;

const decodeEntities = (value = '') => value
  .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

const stripHtml = (html = '') => decodeEntities(html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi, '\n')
  .replace(/<[^>]+>/g, ' '));

const cleanText = (input = '') => {
  const lines = String(input).replace(/\r/g, '').split('\n').map((line) => line.replace(/[ \t]+/g, ' ').trim());
  const frequency = new Map();
  lines.filter((line) => line && line.length < 100).forEach((line) => frequency.set(line, (frequency.get(line) || 0) + 1));
  const repeated = new Set([...frequency].filter(([, count]) => count >= 3).map(([line]) => line));
  const kept = lines.filter((line) => !/^\s*(?:page\s+)?\d+\s*$/i.test(line) && !repeated.has(line));
  return kept.join('\n').replace(/([a-z,;])\n(?=[a-z])/g, '$1 ').replace(/-\n(?=[a-z])/g, '').replace(/\n{3,}/g, '\n\n').trim();
};

const makeChapter = (title, text, index, pageStart, pageEnd) => {
  const cleaned = cleanText(text);
  const wordCount = (cleaned.match(/\S+/g) || []).length;
  return { number: index + 1, title: cleanText(title) || `Chapter ${index + 1}`, text: cleaned, pageStart, pageEnd, wordCount, estimatedMinutes: Math.max(1, Math.ceil(wordCount / 180)) };
};

const detectChapters = ({ text, title = 'Untitled book', pages = [], explicitSections = [] }) => {
  if (explicitSections.length) {
    const chapters = explicitSections.map((section, index) => makeChapter(section.title, section.text, index, section.pageStart, section.pageEnd)).filter((c) => c.text);
    if (chapters.length) return chapters;
  }
  const clean = cleanText(text);
  const lines = clean.split('\n');
  const markers = [];
  lines.forEach((line, index) => {
    const candidate = line.trim();
    if (candidate.length >= 3 && candidate.length <= 100 && HEADING.test(candidate) && (index === 0 || lines[index - 1].trim() === '')) markers.push({ index, title: candidate });
  });
  if (markers.length) {
    if (markers[0].index > 0 && lines.slice(0, markers[0].index).join(' ').trim().split(/\s+/).length > 80) markers.unshift({ index: 0, title: 'Front matter' });
    return markers.map((marker, i) => makeChapter(marker.title, lines.slice(marker.index + (marker.index ? 1 : 0), markers[i + 1]?.index ?? lines.length).join('\n'), i)).filter((c) => c.text);
  }
  if (pages.length > 1) {
    return pages.map((page, i) => makeChapter(`Section ${i + 1}`, page.text, i, page.number, page.number)).filter((c) => c.text);
  }
  return [makeChapter(title, clean, 0)].filter((c) => c.text);
};

module.exports = { cleanText, detectChapters, stripHtml, decodeEntities, HEADING };
