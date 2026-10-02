-- daily_card_unlock 상품 비활성화
--
-- 배경: 007/008/009 마이그레이션에서 "오늘의 카드 즉시해제"(500원,
-- ad_unlockable=true) 상품으로 만들어졌으나, 이걸 실제로 판매하는 화면이
-- 한 번도 구현되지 않았다 — DB 가격표와 admin 라벨에만 존재하는 고아
-- 상품이었다(2026-10-01 리워드 광고 연동 작업 중 발견).
--
-- 지금 당장 "오늘의 카드 즉시해제"가 정확히 뭘 잠금해제해야 하는지
-- (기존 무료 DailyCardWidget과 어떻게 달라야 하는지)는 별도 설계가
-- 필요한 사안이라, 콘텐츠를 새로 만들기보다 우선 비활성화해 가격표/문의
-- 혼란을 없앤다. 리워드 광고는 이번 작업에서 별조각 직접지급형
-- (grant_ad_cash_reward, claimAdCashReward)으로 WalletSection에 연결했다.
--
-- 나중에 daily_card_unlock을 실제 콘텐츠로 설계하게 되면 is_active를
-- true로 되돌리면 된다 — 관련 RPC(unlock_daily_content)는 그대로 둔다.

update product_prices
set is_active = false, updated_at = now()
where product_code = 'daily_card_unlock';
