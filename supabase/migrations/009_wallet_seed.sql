-- ============================================================
-- 상품 가격 시드
-- ad_unlockable=false 인 상품(AI 호출 원가가 있는 유료 콘텐츠)은
-- unlock_daily_content()/프론트 어디서도 광고로 우회 해제 불가
-- ============================================================

insert into product_prices (product_code, display_name, cash_price, ai_model, ad_unlockable, is_active)
values
  ('daily_card_unlock', '오늘의 카드 즉시해제', 500, null, true, true),
  ('premium_report',    '정밀 사주 리포트',     1900, 'haiku-4.5', false, true),
  ('compatibility_deep','심층 궁합 분석',       2500, 'haiku-4.5', false, true),
  ('daeun_seun',        '대운·세운 해석',       1500, 'haiku-4.5', false, true)
on conflict (product_code) do update set
  display_name  = excluded.display_name,
  cash_price    = excluded.cash_price,
  ai_model      = excluded.ai_model,
  ad_unlockable = excluded.ad_unlockable,
  is_active     = excluded.is_active,
  updated_at    = now();

-- 캐시 충전 단위(보너스율)는 코드 테이블이 아니라 프론트 상수로 관리해도 무방하나,
-- 추후 프로모션 실험을 위해 DB화하려면 아래처럼 별도 테이블을 추가할 수 있음:
--
-- create table cash_charge_options (
--   krw_amount   integer primary key,
--   cash_amount  integer not null,
--   bonus_label  text
-- );
-- insert into cash_charge_options values
--   (1000, 1000, null),
--   (3000, 3300, '+10%'),
--   (5000, 5750, '+15%'),
--   (10000, 12000, '+20%');
