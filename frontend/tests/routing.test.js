import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('application routes are public and contain no auth redirect', () => {
  const app = fs.readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
  assert.match(app, /path="\/"/);
  assert.match(app, /reader\/:bookId/);
  assert.doesNotMatch(app, /ProtectedRoute|\/login|token/);
});
