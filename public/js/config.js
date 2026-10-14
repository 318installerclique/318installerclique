// お店の基本設定（店名・送料などはここだけ変更すれば全体に反映されます）
// 画面（ブラウザ）と決済の仕組み（functions/）の両方から読み込まれます。
export const STORE = {
  name: 'VINTAGE STORE',          // 仮の店名
  tagline: 'SELECT VINTAGE CLOTHING',
  isProvisionalName: true,        // 店名が決まったら false
  instagramUrl: '',               // 例: https://www.instagram.com/xxxx/
  contactEmail: '',               // お問い合わせ先メール（未定）
};

export const SHIPPING = {
  feeJpy: 1000,                   // 全国一律送料（仮）
  freeOverJpy: null,              // 例: 30000（この金額以上で送料無料）。null なら送料無料なし
  label: '全国一律送料',
};

export const CHECKOUT = {
  maxItems: 10,                   // 1回の購入で選べる最大点数
  sessionMinutes: 30,             // 決済画面の有効時間（Stripe の下限が30分）
  holdExtraMinutes: 2,            // 決済画面が閉じた後も念のため取り置く時間
};

export const CATEGORIES = [
  { id: 'outer', label: 'アウター' },
  { id: 'tops', label: 'トップス' },
  { id: 'shirts', label: 'シャツ' },
  { id: 'bottoms', label: 'パンツ' },
  { id: 'shoes', label: 'シューズ' },
  { id: 'accessories', label: '小物・ジュエリー' },
];
