# content/：WORKS・COLUMN・NEWS のデータ

1件 = 1ファイル（JSON）。`_template.json` をコピーして、ファイル名を `id` と同じにします（例 `works/shop-a-interior.json`）。
`_` で始まるファイルは読み込みません。

## いちばん大事な決まり：下書きをここに置かない

このリポジトリは GitHub で公開されています（誰でも中身を読めます）。サイトで 404 にしていても、GitHub からは読めます。

- 下書き（本人未確認の実績・記事・お知らせ、写真の許諾が済んでいないもの）は **Notion で管理** する
- 職人本人の確認と代表の承認が済み、**公開するものだけ** を `content/` に入れる（`"status": "published"`）
- 公開をやめるときは、ファイルを消して作り直す
- `content/` に `published` 以外のファイルがあると、テスト（`tests/build.test.mjs`）が止まる（`_` で始まる見本は除く）

## 公開の決まり（代表判断 2026-10-29）

- `"status": "published"` にしたものだけがサイトに出ます。それ以外（`draft` など）はページ・一覧・sitemap に出ません
- 架空の実績・職人・地域・お客様の声を書かない。分からない項目は空のまま（空の項目は表示されません）
- WORKS：写真1枚以上。写真ごとに掲載許諾の記録（`permission.confirmedAt`・`by`）が無いと公開できません
- COLUMN：技術確認者（`reviewer`）と公開日（`publishedAt`）が無いと公開できません。更新日（`updatedAt`）は本文を直した日だけ入れる
- NEWS：知らせるべき事実があるときだけ。0件の間はトップの NEWS 欄とメニューの項目が出ません

## 反映のしかた

```
node scripts/build.mjs      # ページを作り直す（works/・column/・news/・index.html の一部・sitemap.xml）
node --test tests/*.test.mjs  # テスト（作り直し忘れもここで分かる）
```

作り直したファイルも一緒にコミットします（Cloudflare 側ではビルドしない）。
写真は `assets/img/works/<id>/` に jpg と webp を置き、`width`・`height` に実寸（px）を入れます。

## サイトからは読めません（GitHub からは読めます）

`functions/_middleware.js` が `/content/`・`/tests/`・`/scripts/`・`/docs/`・`/functions/`・`/README` を 404 で返します（%エンコードなどの言い換えも含む）。
ただしリポジトリ自体は公開なので、上の「下書きをここに置かない」を守ります。
