// 見た目の確認用：テスト用のダミーで 1件・複数件 のページを、リポジトリの外のフォルダに作る（公開物には出さない）
//   node tests/render-fixtures.mjs <出力先> <one|many>
// ダミーの写真は今サイトにある試作の写真を使う。架空の実績として公開しない
import { cp, mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { generate, loadInput } from '../scripts/build.mjs';

const [out, mode = 'many'] = process.argv.slice(2);
if (!out) { console.error('出力先を指定してください'); process.exit(1); }
const ROOT = new URL('..', import.meta.url).pathname;
const input = await loadInput(ROOT);
const ok = { confirmedAt: '2026-01-01', by: 'テスト用' };
const img = (n, w, h, alt) => ({ src: `/assets/img/${n}.jpg`, webp: `/assets/img/${n}.webp`, width: w, height: h, alt, permission: ok });
const work = (i, d) => ({
  id: `dummy-work-${i}`, status: 'published', title: `【ダミー】施工事例 ${i}`, summary: '【ダミー】見た目の確認用の文章です。実在の施工事例ではありません。',
  category: '【ダミー】内装仕上げ', scope: '【ダミー】施工内容', location: '【ダミー】施工箇所', period: '【ダミー】時期', publishedAt: d,
  craftsmen: [{ name: '【ダミー】担当', craft: '職種' }],
  points: { issue: '【ダミー】課題', method: '【ダミー】方法', reason: '【ダミー】理由', result: '【ダミー】仕上がり' },
  photos: [img('site-wall', 709, 785, 'ダミー写真1'), img('site-wall-detail', 460, 360, 'ダミー写真2'), img('craft-floor', 420, 455, 'ダミー写真3')],
  relatedWorks: [`dummy-work-${i === 1 ? 2 : 1}`], relatedColumns: ['dummy-column-1'],
});
const column = (i, d) => ({
  id: `dummy-column-${i}`, status: 'published', title: `【ダミー】コラムの題名 ${i}：見た目の確認用`, summary: '【ダミー】見た目の確認用の概要です。',
  category: '【ダミー】工種', reviewer: '【ダミー】確認者', publishedAt: d, updatedAt: d,
  body: '【ダミー】導入の段落です。\n\n## 【ダミー】見出し\n\n【ダミー】本文の段落です。見た目の確認用です。\n\n- 【ダミー】箇条書き1\n- 【ダミー】箇条書き2',
  images: [img('site-wall-detail', 460, 360, 'ダミー写真')], relatedWorks: ['dummy-work-1'],
});
const news = (i, d) => ({ id: `dummy-news-${i}`, status: 'published', title: `【ダミー】お知らせ ${i}`, date: d, body: '【ダミー】見た目の確認用のお知らせです。' });
const n = mode === 'one' ? 1 : 4;
const days = ['2026-01-10', '2026-02-10', '2026-03-10', '2026-04-10'];
const { files } = generate({
  ...input,
  works: Array.from({ length: n }, (_, i) => work(i + 1, days[i])),
  columns: Array.from({ length: Math.min(n, 3) }, (_, i) => column(i + 1, days[i])),
  news: Array.from({ length: n }, (_, i) => news(i + 1, days[i])),
});
await mkdir(out, { recursive: true });
for (const f of ['assets', 'functions', 'robots.txt']) await cp(join(ROOT, f), join(out, f), { recursive: true });
for (const [p, body] of files) { await mkdir(dirname(join(out, p)), { recursive: true }); await writeFile(join(out, p), body); }
console.log(`${out} に作りました（${mode}）`);
