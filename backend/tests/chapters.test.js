const test = require('node:test');
const assert = require('node:assert/strict');
const { cleanText, detectChapters } = require('../utils/chapters');
const { verifySignature } = require('../utils/extractText');
const { answerQuestion } = require('../utils/tutor');

test('detects structural chapter headings instead of fixed-length splitting', () => {
  const text = `CHAPTER ONE\n\nThe first concept is gravity. It attracts masses.\n\nCHAPTER TWO\n\nThe second concept is motion. It describes change.`;
  const chapters = detectChapters({ text, title: 'Physics' });
  assert.equal(chapters.length, 2);
  assert.equal(chapters[0].title, 'CHAPTER ONE');
  assert.match(chapters[1].text, /motion/);
});

test('removes repeated headers and page numbers without changing prose', () => {
  const input = 'Book Header\n1\nFirst paragraph.\nBook Header\n2\nSecond paragraph.\nBook Header\n3\nThird paragraph.';
  const result = cleanText(input);
  assert.doesNotMatch(result, /Book Header|\n2\n/);
  assert.match(result, /First paragraph/);
});

test('rejects MIME-spoofed PDF data', () => {
  assert.throws(() => verifySignature(Buffer.from('not a pdf'), 'pdf'), /do not match/);
  assert.doesNotThrow(() => verifySignature(Buffer.from('%PDF-1.7'), 'pdf'));
});

test('tutor answers only with grounded source sentences', () => {
  const chapter = { number: 1, title: 'Plants', text: 'Photosynthesis lets plants convert light into chemical energy.', pageStart: 7 };
  const found = answerQuestion([chapter], 'How do plants convert light?');
  assert.equal(found.found, true);
  assert.match(found.answer, /Photosynthesis/);
  assert.equal(found.citations[0].page, 7);
  const missing = answerQuestion([chapter], 'Who won the football championship?');
  assert.equal(missing.found, false);
  assert.match(missing.answer, /could not find/i);
});
