import test from 'node:test';
import assert from 'node:assert/strict';
import { splitIntoChunks, speechLocale, voicesForLanguage } from '../src/utils/speech.js';

test('speech chunks preserve all text and prefer sentence boundaries', () => {
  const text = 'First sentence is short. Second sentence is also short. Third sentence finishes the sample.';
  const chunks = splitIntoChunks(text, 45);
  assert.ok(chunks.length > 1);
  assert.equal(chunks.join(' ').replace(/\s+/g, ' '), text);
  assert.ok(chunks.every((chunk) => chunk.length <= 45));
});

test('empty speech input produces no chunks', () => assert.deepEqual(splitIntoChunks('   '), []));

test('Hinglish uses the Hindi locale and prefers Hindi voices', () => {
  const voices = [
    { voiceURI: 'english', lang: 'en-US' },
    { voiceURI: 'hindi', lang: 'hi-IN' },
    { voiceURI: 'french', lang: 'fr-FR' },
  ];
  assert.equal(speechLocale('hinglish'), 'hi-IN');
  assert.deepEqual(voicesForLanguage(voices, 'hinglish').map((voice) => voice.voiceURI), ['hindi', 'english']);
});
