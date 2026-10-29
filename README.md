# 318 INSTALLER CLIQUE — Webサイト（2026 リニューアル）

独立した職人のネットワーク「318 INSTALLER CLIQUE」の公式サイトです。
承認済みの v0.5 試作の構成（HERO / WORKS / PROCESS / CREW / ABOUT・CONTACT）をもとにしています。
v0.6（2026-10-29）で FOR PARTNERS・CONTACT の区分（法人／個人）・WORKS 詳細・COLUMN・NEWS・SEO の土台を追加しました（仕様の正本は Notion「318 INSTALLER CLIQUE｜事業構想・経緯・サイト設計」）。

- 作り：HTML・CSS・JavaScript だけ（Cloudflare 側のビルド不要・外部ライブラリなし）。WORKS・COLUMN・NEWS のページは `node scripts/build.mjs` で作り、できたファイルもコミットする
- 文字：Inter Tight（Google Fonts）＋ 端末の日本語ゴシック
- 公開先（予定）：318 専用の Cloudflare Pages プロジェクト（作成・公開は代表の承認後）

## ファイル

| 場所 | 中身 |
|---|---|
| `index.html` | ページ本体。文章はここを直接書き換える |
| `assets/css/site.css` | 見た目。色・文字・余白は先頭の `:root` で一括変更 |
| `assets/js/main.js` | 動き（メニュー・横スクロール・PROCESS・HERO） |
| `assets/img/` | サイトで使う写真・ロゴ（軽くしたもの） |
| `assets/brand/` | ロゴの元データ（旧サイトから引き継ぎ。サイトでは直接使わない） |
| `robots.txt` | 検索ロボット向け（sitemap.xml の場所） |
| `content/` | WORKS・COLUMN・NEWS のデータ（JSON）。書き方は `content/README.md`。公開されない |
| `scripts/build.mjs` | `content/` から `works/`・`column/`・`news/`・`sitemap.xml`・`404.html` と `index.html` の印（`<!-- build:… -->`）の間を作る |
| `works/` `column/` `news/` | 作られたページ（直接書き換えない） |
| `assets/js/analytics.js` | 318 専用の GA4。測定IDが空の間は何も送らない。手順は `docs/search-console-ga4.md` |
| `_redirects` | 公開しないフォルダ（content・tests・scripts・docs）をトップへ移動させる |
| `tests/` | 自動テスト：`node --test tests/*.test.mjs` |

## 文章の差し替え

`index.html` の日本語を直接書き換えます。
`【仮】` と付いているところは試作用です。本番前に差し替えるか、`<span class="tmp">【仮】…</span>` ごと消します。

## 写真の差し替え

写真は1枚につき **jpg と webp の2つ** を `assets/img/` に置きます（webp が読めない古い端末は jpg を使う）。

1. 同じ名前で上書きする場合：`site-wall.jpg` と `site-wall.webp` を両方置き換える
2. 新しい名前にする場合：`index.html` の `<source srcset="…webp">` と `<img src="…jpg">` の2か所を書き換え、`width` と `height` を写真の実寸（px）にする
3. 大きさの目安：横 1600〜2400px、1枚 300KB 前後まで（HERO は全画面なので横 2400px 推奨）

webp の作り方の例（手元に Python と Pillow がある場合）：

```
python3 -c "from PIL import Image; Image.open('photo.jpg').save('photo.webp', quality=78)"
```

## HERO に動画を入れる

1. 動画（mp4・音なし・10〜20秒・5MB 程度まで）を `assets/video/hero.mp4` に置く
2. `index.html` の `<video … data-src="">` を `data-src="assets/video/hero.mp4"` にする

動画は、端末が「視差効果を減らす（動きを減らす）」設定のときや通信量節約モードのときは読み込まず、写真のままになります。

## 動きについて

- PROCESS：縦にスクロールすると、4つの工程が横に進みます。工程名のボタンでも移動できます
- 動きを減らす設定・JavaScript が動かない・画面の高さが足りない（スマホ横向きなど）ときは、縦に並んだ普通のページになります
- WORKS / CREW：PC は矢印ボタン・トラックパッド、スマホはスワイプ。キーボードは一覧を選んで左右キー

## 手元で見る

```
python3 -m http.server 8318
```

ブラウザで http://localhost:8318/ を開きます。

## WORKS・COLUMN・NEWS を足す

`content/README.md` を参照。公開するのは `"status": "published"` のものだけ。0件の間は一覧が「準備中」になり、sitemap に入りません。
NEWS が0件の間は、トップの NEWS 欄とメニューの News が出ません（COLUMN も同じ）。

## 本番公開の前にやること（チェックリスト）

- [ ] 検索に出す：`index.html` の robots の行と `scripts/build.mjs` の `ROBOTS` を変えて作り直す（`docs/search-console-ga4.md`）
- [ ] `【仮】` の文章・写真をすべて差し替える（施工事例の写真は掲載の許可を確認）
- [ ] CREW に個人を載せる場合は、本人の掲載許可を取ってから追加する
- [ ] お問い合わせの受付方法（担当・送信先・個人情報の扱い・振り分け・契約の当事者）を決め、フォームを動かす。今は送信しない作り（`assets/js/main.js` の CONTACT）
- [ ] ドメインを決め、`content/site.json` の `origin` と `robots.txt` を変えて作り直す。トップの `og:image` も絶対URL（https://〜）にする
- [ ] GA4（318 専用）と Search Console の登録（`docs/search-console-ga4.md`）
- [x] Cloudflare Pages の 318 専用プロジェクト（`318-installer-clique`。本番は `site-2026/phase1`、2026-10-27 時点の反映記録から）
- [ ] 旧サイト（GitHub Pages）の停止・転送（代表の承認後）
