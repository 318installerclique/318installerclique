// assets/js/analytics.js：送るかどうかの判断
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const { shouldSend } = require('../assets/js/analytics.js');
const HOSTS = ['318-installer-clique.pages.dev'];

test('測定IDが空の間は送らない', () => {
  assert.equal(shouldSend('', '318-installer-clique.pages.dev', HOSTS), false);
});
test('本番のホスト名と完全一致のときだけ送る。確認用アドレス・手元では送らない', () => {
  assert.equal(shouldSend('G-TEST', '318-installer-clique.pages.dev', HOSTS), true);
  assert.equal(shouldSend('G-TEST', 'site-2026-v06.318-installer-clique.pages.dev', HOSTS), false);
  assert.equal(shouldSend('G-TEST', 'f887deed.318-installer-clique.pages.dev', HOSTS), false);
  assert.equal(shouldSend('G-TEST', 'localhost', HOSTS), false);
  assert.equal(shouldSend('G-TEST', 'evil318-installer-clique.pages.dev', HOSTS), false);
});
test('今の設定：測定IDは空（送信しない）。SIDE B の測定IDを使っていない', async () => {
  const src = await readFile(new URL('../assets/js/analytics.js', import.meta.url), 'utf8');
  assert.match(src, /var GA4_ID = '';/);
  assert.doesNotMatch(src, /G-TCZ741B4BT|G-B4ZJJYQ4X3/);
});
