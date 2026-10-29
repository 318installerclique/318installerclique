# content/：WORKS・COLUMN・NEWS のデータ

1件 = 1ファイル（JSON）。`_template.json` をコピーして、ファイル名を `id` と同じにします（例 `works/shop-a-interior.json`）。
`_` で始まるファイルは読み込みません。

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

## このフォルダは公開されません

`_redirects` で `/content/*` `/tests/*` `/scripts/*` `/docs/*` をトップへ移動させています（下書きのデータを URL で読めないように）。
