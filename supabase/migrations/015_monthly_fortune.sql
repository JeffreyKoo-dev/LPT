-- Phase 3 — "이번 달 운세" 상품 (반복 수익 모델 보완)
--
-- 배경: 정밀 사주 리포트·대운세운 해석은 한 번 사면 평생 캐싱되어 재구매
-- 유인이 구조적으로 없다(사주 자체가 평생 안 바뀌므로). 반면 월운(月運)은
-- 매달 실제로 바뀌는 값이라, "이번 달 운세"를 상품화하면 자연스럽게
-- 매달 재구매할 이유가 생긴다. 가격을 낮게 잡아 매달 부담 없이 사게 한다.

insert into product_prices (product_code, display_name, cash_price, ai_model, ad_unlockable, is_active)
values
  ('monthly_fortune', '이번 달 운세', 700, 'haiku-4.5', false, true)
on conflict (product_code) do update set
  display_name  = excluded.display_name,
  cash_price    = excluded.cash_price,
  ai_model      = excluded.ai_model,
  ad_unlockable = excluded.ad_unlockable,
  is_active     = excluded.is_active,
  updated_at    = now();
