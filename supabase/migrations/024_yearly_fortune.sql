-- Phase 3 — "올해의 운세" 상품 (연 단위 반복 수익, 새해 시즌 프로모션용)
insert into product_prices (product_code, display_name, cash_price, ai_model, ad_unlockable, is_active)
values
  ('yearly_fortune', '올해의 운세', 3000, 'haiku-4.5', false, true)
on conflict (product_code) do update set
  display_name  = excluded.display_name,
  cash_price    = excluded.cash_price,
  ai_model      = excluded.ai_model,
  ad_unlockable = excluded.ad_unlockable,
  is_active     = excluded.is_active,
  updated_at    = now();
