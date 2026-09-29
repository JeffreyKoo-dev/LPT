-- LPT(QuestofMe) 마이그레이션 001~028 적용 여부 일괄 확인
-- Supabase 대시보드 > SQL Editor 에서 그대로 실행하세요.

with func_defs as (
  select p.proname as fn_name, pg_get_functiondef(p.oid) as def
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
)
select migration, status, note from (
  values
  ('001_add_quest_log',
    case when exists (select 1 from information_schema.columns
      where table_schema='public' and table_name='user_profiles' and column_name='quest_log')
      then '✅ 적용됨' else '❌ 누락' end,
    'user_profiles.quest_log 컬럼'),

  ('002_friendships',
    case when exists (select 1 from information_schema.tables
      where table_schema='public' and table_name='friendships')
      then '✅ 적용됨' else '❌ 누락' end,
    'friendships 테이블'),

  ('003_moderation_reports',
    case when exists (select 1 from information_schema.tables
      where table_schema='public' and table_name='moderation_reports')
      then '✅ 적용됨' else '❌ 누락' end,
    'moderation_reports 테이블'),

  ('004_shared_profiles',
    case when exists (select 1 from information_schema.tables
      where table_schema='public' and table_name='shared_profiles')
      then '✅ 적용됨' else '❌ 누락' end,
    'shared_profiles 테이블'),

  ('005_coupang_cache',
    case when exists (select 1 from information_schema.tables
      where table_schema='public' and table_name='coupang_product_cache')
      then '✅ 적용됨' else '❌ 누락' end,
    'coupang_product_cache 테이블'),

  ('006_sync_analysis_report',
    case when exists (select 1 from information_schema.columns
      where table_schema='public' and table_name='user_profiles' and column_name='analysis_report')
      then '✅ 적용됨' else '❌ 누락' end,
    'user_profiles.analysis_report 컬럼'),

  ('007_wallet_schema',
    case when (select count(*) from information_schema.tables
      where table_schema='public' and table_name in ('wallets','wallet_transactions','product_prices','daily_unlocks')) = 4
      then '✅ 적용됨' else '❌ 누락' end,
    'wallets/wallet_transactions/product_prices/daily_unlocks 테이블 4개'),

  ('008_wallet_functions',
    case when (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname in
      ('grant_ad_cash_reward','unlock_daily_content','purchase_product','charge_cash_from_pg')) >= 4
      then '✅ 적용됨(단, 최신버전 여부는 020/021/026/028 항목 참고)' else '❌ 누락' end,
    '지갑 관련 함수 4종 존재 여부'),

  ('009_wallet_seed',
    case when (select count(*) from product_prices
      where product_code in ('daily_card_unlock','premium_report','compatibility_deep','daeun_seun')) = 4
      then '✅ 적용됨' else '❌ 누락' end,
    'product_prices 시드 4종'),

  ('010_premium_content',
    case when exists (select 1 from information_schema.tables
      where table_schema='public' and table_name='premium_content')
      then '✅ 적용됨' else '❌ 누락' end,
    'premium_content 테이블'),

  ('011_admin_functions',
    case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='admin_adjust_cash')
      then '✅ 적용됨' else '❌ 누락' end,
    'admin_adjust_cash() 함수'),

  ('012_moderation_cache',
    case when exists (select 1 from information_schema.tables
      where table_schema='public' and table_name='moderation_cache')
      then '✅ 적용됨' else '❌ 누락' end,
    'moderation_cache 테이블'),

  ('013_account_features',
    case when exists (select 1 from information_schema.columns
      where table_schema='public' and table_name='shared_profiles' and column_name='user_id')
      then '✅ 적용됨' else '❌ 누락' end,
    'shared_profiles.user_id 컬럼'),

  ('014_code_review_fixes',
    case when exists (select 1 from pg_indexes
      where schemaname='public' and indexname='idx_wallet_tx_charge_reference')
      then '✅ 적용됨' else '❌ 누락' end,
    'idx_wallet_tx_charge_reference 유니크 인덱스(결제 중복지급 방지)'),

  ('015_monthly_fortune',
    case when exists (select 1 from product_prices where product_code='monthly_fortune')
      then '✅ 적용됨' else '❌ 누락' end,
    'product_prices.monthly_fortune 상품'),

  ('016_charge_options_db',
    case when exists (select 1 from information_schema.tables
      where table_schema='public' and table_name='cash_charge_options')
      then '✅ 적용됨' else '❌ 누락' end,
    'cash_charge_options 테이블'),

  ('017_welcome_cash',
    case when exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and p.proname='handle_new_user_wallet')
      then '✅ 적용됨(최신버전 여부는 021 항목 참고)' else '❌ 누락' end,
    'handle_new_user_wallet() 함수 존재'),

  ('018_milestone_missions',
    case when (select count(*) from information_schema.tables
      where table_schema='public' and table_name in ('milestone_definitions','user_milestone_claims')) = 2
      then '✅ 적용됨' else '❌ 누락' end,
    'milestone_definitions/user_milestone_claims 테이블'),

  ('019_milestone_improvements',
    case when exists (select 1 from func_defs where fn_name='get_user_metric_value')
      then '✅ 적용됨(최신버전 여부는 023 항목 참고)' else '❌ 누락' end,
    'get_user_metric_value() 함수 존재'),

  ('020_bonus_cash_split',
    case when exists (select 1 from information_schema.columns
      where table_schema='public' and table_name='wallets' and column_name='bonus_balance')
      then '✅ 적용됨' else '❌ 누락' end,
    'wallets.bonus_balance 컬럼(무료캐시/실제캐시 분리)'),

  ('021_gem_star_naming',
    case when exists (select 1 from func_defs
      where fn_name='grant_ad_cash_reward' and def like '%별조각%')
      then '✅ 적용됨(최신)' else '❌ 누락 또는 구버전(캐시→보석/별조각 리네이밍 전)' end,
    'grant_ad_cash_reward() 함수 본문에 "별조각" 문구 포함 여부'),

  ('022_payment_refund_handling',
    case when exists (select 1 from information_schema.tables
      where table_schema='public' and table_name='payment_refund_events')
      then '✅ 적용됨' else '❌ 누락' end,
    'payment_refund_events 테이블(환불/차지백 대응)'),

  ('023_revenue_hardening',
    case when exists (select 1 from func_defs
      where fn_name='get_user_metric_value' and def like '%referred_paying_friends%')
      then '✅ 적용됨(최신)' else '❌ 누락 또는 구버전' end,
    'get_user_metric_value() 함수 본문에 referred_paying_friends 포함 여부'),

  ('024_yearly_fortune',
    case when exists (select 1 from product_prices where product_code='yearly_fortune')
      then '✅ 적용됨' else '❌ 누락' end,
    'product_prices.yearly_fortune 상품'),

  ('025_compatibility_bundle',
    case when exists (select 1 from information_schema.tables
      where table_schema='public' and table_name='compatibility_vouchers')
      then '✅ 적용됨' else '❌ 누락' end,
    'compatibility_vouchers 테이블(궁합권)'),

  ('026_weekly_pass',
    case when exists (select 1 from information_schema.tables
      where table_schema='public' and table_name='active_passes')
      and exists (select 1 from func_defs where fn_name='unlock_daily_content' and def like '%active_passes%')
      then '✅ 적용됨(최신)' else '❌ 누락 또는 구버전' end,
    'active_passes 테이블 + unlock_daily_content() 최신본(이용권 연동)'),

  ('027_winback_bonus',
    case when exists (select 1 from func_defs where fn_name='check_winback_bonus')
      then '✅ 적용됨(최신버전 여부는 028 항목 참고)' else '❌ 누락' end,
    'check_winback_bonus() 함수 존재'),

  ('028_code_review_fixes_2',
    case when exists (select 1 from func_defs
      where fn_name='purchase_product' and def like '%compatibility_bundle_3%')
      and exists (select 1 from func_defs
      where fn_name='check_winback_bonus' and def like '%user_id = v_user_id for update%')
      then '✅ 적용됨(최신, 레이스컨디션/오상품 방어 반영)' else '❌ 누락 또는 구버전' end,
    'purchase_product/check_winback_bonus 최신본(2차 코드리뷰 수정)')

) as t(migration, status, note)
order by migration;
