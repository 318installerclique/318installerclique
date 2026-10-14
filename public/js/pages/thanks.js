import { setupLayout } from '../layout.js';
import { clearCart } from '../lib/cart.js';

setupLayout();
// 決済完了画面から戻ってきたらカートを空にする
if (new URLSearchParams(location.search).get('session_id')) clearCart();
