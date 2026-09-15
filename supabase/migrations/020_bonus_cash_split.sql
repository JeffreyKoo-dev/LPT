-- Phase 3 — 두 종류 캐시 분리 (보너스 캐시 / 실제 캐시)
--
-- 배경: 웰컴캐시+마일스톤 보상을 전부 합치면 한 사용자가 최대 약
-- 20,300캐시를 무료로 받을 수 있는데, 지금까지는 이게 AI 호출 원가가
-- 있는 상품(정밀리포트 등)에도 무제한으로 쓰일 수 있었다. AI 원가는
-- 실제로 나가는데 매출은 0원인 상황이 반복될 수 있어, 게임업계에서
-- 흔히 쓰는 "소프트 캐시/하드 캐시" 패턴으로 분리한다.
--
-- 원칙:
-- - 무료 지급(웰컴캐시·마일스톤 보상·광고 리워드)은 전부 bonus_balance로
-- - 실제 결제(토스페이먼츠)는 cash_balance로 (기존과 동일)
-- - 원가가 없는 상품(ad_unlockable=true, 오늘의 카드)은 bonus_balance를
--   먼저 쓰고 모자라면 cash_balance로 나머지를 채운다
-- - 원가가 있는 상품(ad_unlockable=false, AI 콘텐츠)은 cash_balance만
--   쓸 수 있다 — bonus_balance는 절대 여기 쓰이지 않는다
-- - 관리자 수동 조정(CS 대응)은 실제 결제 문제를 보상하는 것이므로
--   cash_balance를 조정한다(기존과 동일, 변경 없음)

alter table wallets
  add column if not exists bonus_balance integer not null default 0 check (bonus_balance >= 0);

alter table wallet_transactions
  add column if not exists bonus_balance_after integer;

comment on column wallets.bonus_balance is
  '무료로 적립된 캐시(웰컴캐시·마일스톤·광고리워드). AI 원가가 있는 상품에는 쓸 수 없다.';
comment on column wallets.cash_balance is
  '실제 결제로 충전한 캐시(+ 관리자 수동 조정). 모든 상품 결제에 쓸 수 있다.';

-- ============================================================
-- 1) 광고 리워드 → bonus_balance로 적립
-- ============================================================
create or replace function grant_ad_cash_reward(p_reward_amount integer default 100)
returns table(new_balance integer, remaining_today integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today_count integer;
  v_bonus_balance integer;
  v_cash_balance integer;
begin
  if v_user_id is null then
    raise exception '인증되지 않은 요청입니다';
  end if;

  select count(*) into v_today_count
  from ad_view_logs
  where user_id = v_user_id and created_at::date = current_date;

  if v_today_count >= 3 then
    raise exception '오늘의 광고 리워드 횟수(3회)를 모두 사용했습니다';
  end if;

  insert into ad_view_logs(user_id, purpose, reward_cash)
  values (v_user_id, 'cash_reward', p_reward_amount);

  update wallets
  set bonus_balance = bonus_balance + p_reward_amount, updated_at = now()
  where user_id = v_user_id
  returning bonus_balance, cash_balance into v_bonus_balance, v_cash_balance;

  insert into wallet_transactions(user_id, type, amount, balance_after, bonus_balance_after, description)
  values (v_user_id, 'ad_reward', p_reward_amount, v_cash_balance, v_bonus_balance, '리워드 광고 시청 보너스캐시 적립');

  return query select v_bonus_balance + v_cash_balance, (2 - v_today_count);
end;
$$;

-- ============================================================
-- 2) 일일 콘텐츠 해제 — bonus_balance 먼저 쓰고 모자라면 cash_balance
--    (오늘의 카드는 원가가 거의 없는 ad_unlockable=true 상품이라
--    보너스캐시로 쓰는 게 원래 의도에 맞다)
-- ============================================================
create or replace function unlock_daily_content(p_product_code text, p_method text)
returns table(unlocked boolean, new_balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_price integer;
  v_ad_unlockable boolean;
  v_is_active boolean;
  v_today_ad_count integer;
  v_bonus_balance integer;
  v_cash_balance integer;
  v_from_bonus integer;
  v_from_cash integer;
begin
  if v_user_id is null then
    raise exception '인증되지 않은 요청입니다';
  end if;

  select cash_price, ad_unlockable, is_active
  into v_price, v_ad_unlockable, v_is_active
  from product_prices
  where product_code = p_product_code;

  if not found or not v_is_active then
    raise exception '존재하지 않거나 비활성화된 상품입니다: %', p_product_code;
  end if;

  if exists (
    select 1 from daily_unlocks
    where user_id = v_user_id
      and product_code = p_product_code
      and unlock_date = current_date
  ) then
    raise exception '오늘 이미 해제된 콘텐츠입니다';
  end if;

  if p_method = 'ad' then
    if not v_ad_unlockable then
      raise exception '이 콘텐츠는 광고로 해제할 수 없습니다. 캐시로 결제해주세요.';
    end if;

    select count(*) into v_today_ad_count
    from ad_view_logs
    where user_id = v_user_id and created_at::date = current_date;

    if v_today_ad_count >= 3 then
      raise exception '오늘의 광고 리워드 횟수(3회)를 모두 사용했습니다';
    end if;

    insert into ad_view_logs(user_id, purpose, product_code)
    values (v_user_id, 'content_unlock', p_product_code);

    insert into daily_unlocks(user_id, product_code, method)
    values (v_user_id, p_product_code, 'ad');

    select bonus_balance + cash_balance into v_bonus_balance from wallets where user_id = v_user_id;
    return query select true, v_bonus_balance;

  elsif p_method = 'cash' then
    select bonus_balance, cash_balance into v_bonus_balance, v_cash_balance from wallets
    where user_id = v_user_id for update;

    if (v_bonus_balance + v_cash_balance) < v_price then
      raise exception '캐시가 부족합니다 (보유: %, 필요: %)', v_bonus_balance + v_cash_balance, v_price;
    end if;

    if not v_ad_unlockable then
      -- 원가가 있는 상품(이론상 이 함수 경로로는 안 들어오지만 방어적으로 막아둠):
      -- 보너스캐시는 절대 쓰지 않는다
      if v_cash_balance < v_price then
        raise exception '이 상품은 실제 캐시로만 결제할 수 있어요 (보유 실제캐시: %, 필요: %)', v_cash_balance, v_price;
      end if;
      v_from_bonus := 0;
      v_from_cash := v_price;
    else
      v_from_bonus := least(v_bonus_balance, v_price);
      v_from_cash := v_price - v_from_bonus;
    end if;

    update wallets
    set bonus_balance = bonus_balance - v_from_bonus,
        cash_balance = cash_balance - v_from_cash,
        updated_at = now()
    where user_id = v_user_id
    returning bonus_balance, cash_balance into v_bonus_balance, v_cash_balance;

    insert into wallet_transactions(user_id, type, amount, balance_after, bonus_balance_after, product_code, description)
    values (v_user_id, 'spend', -v_price, v_cash_balance, v_bonus_balance, p_product_code, '캐시 결제로 콘텐츠 해제');

    insert into daily_unlocks(user_id, product_code, method)
    values (v_user_id, p_product_code, 'cash');

    return query select true, v_bonus_balance + v_cash_balance;
  else
    raise exception '잘못된 해제 방식입니다: %', p_method;
  end if;
end;
$$;

-- ============================================================
-- 3) 일반 상품 구매(정밀리포트/궁합분석/대운세운/이번달운세) —
--    원가가 있는 상품이라 실제 캐시(cash_balance)만 쓸 수 있다.
--    보너스캐시로는 절대 결제할 수 없다.
-- ============================================================
create or replace function purchase_product(p_product_code text, p_reference_id text default null)
returns table(new_balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_price integer;
  v_is_active boolean;
  v_ad_unlockable boolean;
  v_bonus_balance integer;
  v_cash_balance integer;
  v_from_bonus integer;
  v_from_cash integer;
begin
  if v_user_id is null then
    raise exception '인증되지 않은 요청입니다';
  end if;

  select cash_price, is_active, ad_unlockable into v_price, v_is_active, v_ad_unlockable
  from product_prices where product_code = p_product_code;

  if not found or not v_is_active then
    raise exception '존재하지 않거나 비활성화된 상품입니다: %', p_product_code;
  end if;

  select bonus_balance, cash_balance into v_bonus_balance, v_cash_balance from wallets
  where user_id = v_user_id for update;

  if v_ad_unlockable then
    -- 원가가 거의 없는 상품: 보너스캐시 먼저, 모자라면 실제캐시
    if (v_bonus_balance + v_cash_balance) < v_price then
      raise exception '캐시가 부족합니다 (보유: %, 필요: %)', v_bonus_balance + v_cash_balance, v_price;
    end if;
    v_from_bonus := least(v_bonus_balance, v_price);
    v_from_cash := v_price - v_from_bonus;
  else
    -- 원가가 있는 상품: 실제캐시만 쓸 수 있다
    if v_cash_balance < v_price then
      raise exception '이 상품은 실제 캐시로만 결제할 수 있어요 (보유 실제캐시: %, 필요: %)', v_cash_balance, v_price;
    end if;
    v_from_bonus := 0;
    v_from_cash := v_price;
  end if;

  update wallets
  set bonus_balance = bonus_balance - v_from_bonus,
      cash_balance = cash_balance - v_from_cash,
      updated_at = now()
  where user_id = v_user_id
  returning bonus_balance, cash_balance into v_bonus_balance, v_cash_balance;

  insert into wallet_transactions(user_id, type, amount, balance_after, bonus_balance_after, product_code, reference_id, description)
  values (v_user_id, 'spend', -v_price, v_cash_balance, v_bonus_balance, p_product_code, p_reference_id, '캐시 결제');

  return query select v_bonus_balance + v_cash_balance;
end;
$$;

-- ============================================================
-- 4) 웰컴 캐시 → bonus_balance로 지급
-- ============================================================
create or replace function handle_new_user_wallet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into wallets(user_id, cash_balance, bonus_balance) values (new.id, 0, 500)
  on conflict (user_id) do nothing;

  insert into wallet_transactions(user_id, type, amount, balance_after, bonus_balance_after, description)
  values (new.id, 'refund', 500, 0, 500, '신규 가입 웰컴 보너스캐시');

  return new;
end;
$$;

-- ============================================================
-- 5) 마일스톤 보상 → bonus_balance로 지급
-- ============================================================
create or replace function claim_milestone_reward(p_milestone_id bigint)
returns table(new_balance integer, reward_cash integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_milestone record;
  v_progress integer;
  v_bonus_balance integer;
  v_cash_balance integer;
begin
  if v_user_id is null then
    raise exception '로그인이 필요합니다';
  end if;

  select * into v_milestone from milestone_definitions
    where id = p_milestone_id and is_active = true;
  if v_milestone is null then
    raise exception '존재하지 않는 미션입니다';
  end if;

  if exists (
    select 1 from user_milestone_claims
    where user_id = v_user_id and milestone_id = p_milestone_id
  ) then
    raise exception '이미 받은 보상입니다';
  end if;

  v_progress := get_user_metric_value(v_user_id, v_milestone.metric_type);
  if v_progress < v_milestone.threshold then
    raise exception '아직 달성하지 못한 목표입니다';
  end if;

  insert into user_milestone_claims(user_id, milestone_id) values (v_user_id, p_milestone_id);

  insert into wallets(user_id, cash_balance, bonus_balance) values (v_user_id, 0, 0)
    on conflict (user_id) do nothing;

  update wallets set bonus_balance = bonus_balance + v_milestone.reward_cash, updated_at = now()
    where user_id = v_user_id
    returning bonus_balance, cash_balance into v_bonus_balance, v_cash_balance;

  insert into wallet_transactions(user_id, type, amount, balance_after, bonus_balance_after, description)
    values (v_user_id, 'refund', v_milestone.reward_cash, v_cash_balance, v_bonus_balance, v_milestone.title || ' 달성 보너스캐시');

  return query select v_bonus_balance + v_cash_balance, v_milestone.reward_cash;
end;
$$;
