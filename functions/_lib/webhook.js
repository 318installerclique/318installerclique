// Stripe からの通知（Webhook）を受けて在庫状態を更新する中心処理
//   checkout.session.completed : 支払い完了 → 商品を「sold」にする
//   checkout.session.expired   : 決済画面の期限切れ → 取り置きを解除する

function productIdsOf(session) {
  return String(session?.metadata?.product_ids || '').split(',').filter(Boolean);
}

export async function handleStripeEvent({ stripe, event, nowSec }) {
  const session = event?.data?.object;
  const ids = productIdsOf(session);
  const token = session?.metadata?.reserve_token || '';
  const result = { type: event?.type, updated: [], conflicts: [] };

  if (event.type === 'checkout.session.completed') {
    if (session.payment_status !== 'paid') return result; // カード決済以外の後払いは対象外
    for (const id of ids) {
      const p = await stripe.getProduct(id);
      const meta = p.metadata || {};
      if (meta.status === 'sold' && meta.sold_session && meta.sold_session !== session.id) {
        // 万一の二重販売。代表が返金対応できるよう記録する
        await stripe.updateProduct(id, { metadata: { conflict_session: session.id } });
        result.conflicts.push(id);
        continue;
      }
      await stripe.updateProduct(id, {
        metadata: {
          status: 'sold',
          sold_at: String(nowSec),
          sold_session: session.id,
          reserved_until: '',
          reserved_token: '',
        },
      });
      result.updated.push(id);
    }
  } else if (event.type === 'checkout.session.expired') {
    for (const id of ids) {
      const p = await stripe.getProduct(id);
      if (p.metadata?.reserved_token === token && p.metadata?.status !== 'sold') {
        await stripe.updateProduct(id, { metadata: { reserved_until: '', reserved_token: '' } });
        result.updated.push(id);
      }
    }
  }
  return result;
}
