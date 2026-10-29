# Search Console と GA4（318 専用）の登録手順

- 作成：2026-10-29（Claude Code。v0.6）
- いまの状態：**どちらも未登録**。サイト側の仕組みだけ用意済み（GA4 の測定IDは空＝何も送らない。サイト全体は noindex）
- 実施の時期：**正式公開を代表が承認し、正式なアドレス（ドメイン）が決まってから**。費用はかかりません
- SIDE B とは**別のプロパティ**にします（数字を混ぜない）

## 1. GA4（代表の操作 約10分）

1. https://analytics.google.com を開き、左下の「管理」
2. 「＋作成」→「プロパティ」
   - プロパティ名：`318 INSTALLER CLIQUE`
   - タイムゾーン：日本／通貨：日本円
3. ビジネスの情報は、あてはまるものを選ぶ（後から変えられます）
4. 「データストリーム」→「ウェブ」
   - ウェブサイトの URL：正式なアドレス（例 `https://318-installer-clique.pages.dev`）
   - ストリーム名：`318 web`
   - 「拡張計測機能」はオンのまま
5. 表示された **測定ID（G- で始まる）** を Claude に伝える（公開してよい値です）

### Claude の作業（代表の連絡の後）
- `assets/js/analytics.js` の `GA4_ID` に測定IDを入れ、`PRODUCTION_HOSTS` を正式なホスト名にする
- 確認用アドレスでは送らないことをテストで確かめ、代表の承認後に本番へ反映
- 測るもの：ページの閲覧、Instagram のリンク（`instagram_click`）、相談の入口（`contact_cta_click`）。
  **ボタンを押した数と、問い合わせが届いた数は別**に数えます（フォームの送信は受付開始まで無い）

## 2. Search Console（代表の操作 約10分）

1. https://search.google.com/search-console を開く
2. 「プロパティを追加」→「URL プレフィックス」に正式なアドレス（末尾 `/` まで）を入れる
3. 確認方法は「HTML タグ」を選び、表示された `<meta name="google-site-verification" …>` を Claude に伝える
   （公開してよい値です。Claude がトップページに入れて反映した後、「確認」を押す）
4. 確認できたら、左の「サイトマップ」に `sitemap.xml` を入れて「送信」

## 3. 正式公開のときに Claude が切り替えること（代表の承認後）

- `scripts/build.mjs` の `ROBOTS` を `index, follow` にし、`index.html` の robots の行も同じにして作り直す
- `content/site.json` の `origin` と `robots.txt` の `Sitemap:` を正式なアドレスにする
- 本番に反映し、Search Console の「URL 検査」でトップを確認

## 注意

- 検索の順位や問い合わせの数は保証できません。見る順は ① 有効な問い合わせ・商談 ② 検索からの流入と検索語 ③ WORKS・COLUMN の閲覧（Notion 正本 2026-10-29）
- 対応地域・工種が本人に確認できるまで、地域名のページは作りません
