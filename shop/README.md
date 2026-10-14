# 318 Online Store（試作 / 案A：見た目のみ）

参考レイアウト（スマホ縦長・黒基調・セリフ体の大見出し・2列の商品グリッド）をもとにした
EC サイトの画面試作です。**決済・カート・会員機能はまだありません。**

## ページ
| ファイル | 内容 |
|---|---|
| `index.html` | ストアトップ（Vintage ヒーロー / Online Shopping 導線） |
| `products.html` | 商品一覧（カテゴリ絞り込み・ページ送り `?page=`・お気に入り `?fav=1`） |

## 画像の差し替え
- 背景画像：`img/` に以下の名前で置くと自動で表示されます（無い間はグラデーション）
  - `hero.jpg`（トップ大画像） / `promo.jpg`（Online Shopping） / `items-head.jpg`（Items 見出し） / `feature.jpg`（一覧の横長画像）
- 商品画像：`js/products.js` の各商品の `image` にパスを書く（例 `img/items/p001.jpg`）。空なら `img/placeholder.svg`

## 商品の追加・編集
`js/products.js` だけを編集します。現在のデータはすべて **仮のサンプル** です。

## 確認方法
ES Modules を使うため、ファイルを直接開くのではなくサーバー経由で開いてください。
```
python3 -m http.server   # リポジトリ直下で実行 → http://localhost:8000/shop/
cd shop && npm test      # ロジックのテスト（Node 18+）
```

## 未実装（次の判断事項）
- カート・決済（案B：Stripe/BASE 等の連携、案C：Shopify/EC-CUBE 移行）
- マイページ、商品詳細ページ、検索
- 既存 `index.html` からストアへの導線
