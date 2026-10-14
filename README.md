# Vintage EC（仮）

新会社 Phase 1 の古着EC の土台です。**店名・色は仮**です（`VINTAGE STORE`、白黒）。

- 月額費用：0円で運用できる構成（サーバー：Cloudflare Pages 無料枠）
- かかるお金：カード決済手数料（Stripe、目安3.6％）と独自ドメイン代のみ
- 商品の登録・管理：**Stripe の管理画面（スマホアプリ可）で行います**。サイトの編集は不要です

> 状態：土台のみ。未公開。Stripe・Cloudflare には未接続（サンプル商品で表示する「デモモード」で動きます）。

---

## できること

| 機能 | 内容 |
|---|---|
| トップ | 大きな写真、新着8点、お店の紹介 |
| 商品一覧 | カテゴリ・並び順、売り切れを隠す、24点ごとのページ送り。SOLD OUT は一覧の最後に表示 |
| 商品詳細 | 写真（複数）、価格（税込）、年代・サイズ・実寸・状態、カートに入れる |
| カート | 送料計算（全国一律・送料無料ラインも設定可）、売り切れ商品の検出 |
| 決済 | Stripe の決済画面（カードのみ）。お届け先・電話番号もそこで入力 |
| 一点物の二重販売防止 | 決済画面に進んだ商品は最大32分「取り置き」。支払い完了で自動的に SOLD |
| 法定ページ | 特定商取引法表記・プライバシーポリシー・ご利用ガイドの下書き（【】部分は要記入） |

## 店名・色・送料の変え方

| 変えたいもの | ファイル |
|---|---|
| 店名・Instagram・メールアドレス | `public/js/config.js` の `STORE` |
| 送料・送料無料ライン | `public/js/config.js` の `SHIPPING` |
| カテゴリ | `public/js/config.js` の `CATEGORIES` |
| 色・フォント | `public/css/site.css` の先頭（`:root`） |
| トップの大きな写真 | `public/img/hero.jpg` を置く |

## 商品の登録方法（Stripe 接続後）

Stripe の管理画面で「商品を追加」し、次を入力します。

- **名前**・**説明**・**画像**（最大8枚）
- **価格**：円（JPY）、1回限りの支払い
- **メタデータ**（key / value）：
  - `category`：`outer` / `tops` / `shirts` / `bottoms` / `shoes` / `accessories`
  - `size`（例 `M`, `W32`）、`era`（例 `1970s`）、`condition`（例 `袖口に擦れあり`）、`measurements`（例 `着丈72 / 身幅56`）

保存するとサイトに表示されます（反映まで最大30秒）。売れると自動で `status = sold` が付き、SOLD OUT になります。
サイトから消したいときは、商品を「アーカイブ」します。

## 公開までに必要なこと（代表の作業）

1. 法人設立・**古物商許可**の取得
2. **Stripe アカウント**作成（法人名義）と本人確認
3. **Cloudflare アカウント**作成 → Pages でこのリポジトリを接続
   - ビルドコマンド：なし ／ 公開ディレクトリ：`public`
4. Cloudflare の環境変数（Secrets）を設定
   - `STRIPE_SECRET_KEY`：Stripe の秘密鍵
   - `STRIPE_WEBHOOK_SECRET`：下の Webhook 作成時に表示される鍵
   - `SITE_ORIGIN`（任意）：例 `https://example.com`
5. Stripe で Webhook を作成
   - URL：`https://（サイトのドメイン）/api/stripe-webhook`
   - イベント：`checkout.session.completed`、`checkout.session.expired`
6. 独自ドメインの取得・接続
7. **古物商のURL届出**（サイト公開から2週間以内、警察署経由で公安委員会へ）
8. 法定ページの【】を埋める（返品条件・発送日数・連絡先・許可番号）

## 開発者向け

```
npm test                 # テスト（Node 20 以上）
python3 -m http.server -d public 8000   # デモモードで見た目確認 → http://localhost:8000
npm run dev              # Cloudflare と同じ環境で起動（.dev.vars に鍵を書くと Stripe テスト環境に接続）
```

### 構成

```
public/            画面（HTML/CSS/JS）
  js/config.js     お店の設定（画面と決済の両方から使う）
  js/lib/          計算・カート・データ取得
  js/pages/        ページごとの処理
  data/sample-products.json  デモ用サンプル商品
functions/         Cloudflare Pages Functions（サーバー側）
  api/products     商品一覧・詳細（Stripe から取得）
  api/checkout.js  決済画面の作成と取り置き
  api/stripe-webhook.js  支払い完了→SOLD／期限切れ→取り置き解除
  _lib/            Stripe 接続・在庫判定・署名検証
tests/             自動テスト（偽の Stripe を使用）
```

### 既知の制約

- 支払い方法はカードのみ（コンビニ払い等は未対応）
- 同時に同じ商品を買おうとした場合は、取り置き直後の読み直しで検出しますが、ごく短い時間差の同時操作を完全には防げません。万一二重に売れた場合は、商品のメタデータに `conflict_session` が記録されるので、返金で対応します
- 在庫数は1点前提（同じ商品を複数在庫として売る仕組みはありません）
