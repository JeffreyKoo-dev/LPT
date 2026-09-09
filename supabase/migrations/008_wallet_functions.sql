-- ============================================================
-- LPT(QuestofME) 캐시 결제/광고 리워드 시스템 — 함수
-- 모든 함수는 SECURITY DEFINER: RLS를 우회해 잔액을 안전하게 변경.
-- 클라이언트는 반드시 이 함수들(rpc)만 호출해야 하며,
-- 테이블 직접 write는 RLS로 차단되어 있음.
-- ============================================================

-- ------------------------------------------------------------
-- 1) 리워드 광고 시청 → 캐시 적립 (하루 3회 상한)
-- ------------------------------------------------------------
create or replace function grant_ad_cash_reward(p_reward_amount integer default 100)
returns table(new_balance integer, remaining_today integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today_count integer;
  v_balance integer;
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
  set cash_balance = cash_balance + p_reward_amount, updated_at = now()
  where user_id = v_user_id
  returning cash_balance into v_balance;

  insert into wallet_transactions(user_id, type, amount, balance_after, description)
  values (v_user_id, 'ad_reward', p_reward_amount, v_balance, '리워드 광고 시청 캐시 적립');

  return query select v_balance, (2 - v_today_count);
end;
$$;

revoke all on function grant_ad_cash_reward from public;
grant execute on function grant_ad_cash_reward to authenticated;

-- ------------------------------------------------------------
-- 2) 일일 콘텐츠 해제 (오늘의 카드 등) — 캐시 결제 또는 광고 시청
--    ad_unlockable = false인 상품(정밀리포트 등 AI 유료 콘텐츠)은
--    method='ad' 요청이 오더라도 서버에서 거부됨 (프론트 우회 방지)
-- ------------------------------------------------------------
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
  v_balance integer;
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

    select cash_balance into v_balance from wallets where user_id = v_user_id;
    return query select true, v_balance;

  elsif p_method = 'cash' then
    select cash_balance into v_balance from wallets
    where user_id = v_user_id for update;

    if v_balance < v_price then
      raise exception '캐시가 부족합니다 (보유: %, 필요: %)', v_balance, v_price;
    end if;

    update wallets set cash_balance = cash_balance - v_price, updated_at = now()
    where user_id = v_user_id
    returning cash_balance into v_balance;

    insert into wallet_transactions(user_id, type, amount, balance_after, product_code, description)
    values (v_user_id, 'spend', -v_price, v_balance, p_product_code, '캐시 결제로 콘텐츠 해제');

    insert into daily_unlocks(user_id, product_code, method)
    values (v_user_id, p_product_code, 'cash');

    return query select true, v_balance;
  else
    raise exception '잘못된 해제 방식입니다: %', p_method;
  end if;
end;
$$;

revoke all on function unlock_daily_content from public;
grant execute on function unlock_daily_content to authenticated;

-- ------------------------------------------------------------
-- 3) 일반 상품 구매 (정밀 리포트 / 궁합분석 / 대운세운 — 일일 제한 없음)
--    ad_unlockable 여부와 무관하게 이 함수는 오직 캐시 결제만 처리
--    (프리미엄 AI 콘텐츠는 애초에 광고 해제 경로 자체가 없음)
-- ------------------------------------------------------------
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
  v_balance integer;
begin
  if v_user_id is null then
    raise exception '인증되지 않은 요청입니다';
  end if;

  select cash_price, is_active into v_price, v_is_active
  from product_prices where product_code = p_product_code;

  if not found or not v_is_active then
    raise exception '존재하지 않거나 비활성화된 상품입니다: %', p_product_code;
  end if;

  select cash_balance into v_balance from wallets
  where user_id = v_user_id for update;

  if v_balance < v_price then
    raise exception '캐시가 부족합니다 (보유: %, 필요: %)', v_balance, v_price;
  end if;

  update wallets set cash_balance = cash_balance - v_price, updated_at = now()
  where user_id = v_user_id
  returning cash_balance into v_balance;

  insert into wallet_transactions(user_id, type, amount, balance_after, product_code, reference_id, description)
  values (v_user_id, 'spend', -v_price, v_balance, p_product_code, p_reference_id, '캐시 결제');

  return query select v_balance;
end;
$$;

revoke all on function purchase_product from public;
grant execute on function purchase_product to authenticated;

-- ------------------------------------------------------------
-- 4) PG 결제 완료 후 캐시 충전 (service_role 전용 — 웹훅 서버만 호출 가능)
--    authenticated 유저는 이 함수를 직접 호출할 수 없음 (클라이언트發 캐시 위조 방지)
-- ------------------------------------------------------------
create or replace function charge_cash_from_pg(
  p_user_id uuid,
  p_krw_amount integer,
  p_cash_amount integer,
  p_pg_transaction_id text
)
returns table(new_balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  insert into wallets(user_id, cash_balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  update wallets set cash_balance = cash_balance + p_cash_amount, updated_at = now()
  where user_id = p_user_id
  returning cash_balance into v_balance;

  insert into wallet_transactions(user_id, type, amount, balance_after, reference_id, description)
  values (
    p_user_id, 'charge', p_cash_amount, v_balance, p_pg_transaction_id,
    format('%s원 결제 → %s캐시 충전', p_krw_amount, p_cash_amount)
  );

  return query select v_balance;
end;
$$;

revoke all on function charge_cash_from_pg from public;
revoke all on function charge_cash_from_pg from authenticated;
grant execute on function charge_cash_from_pg to service_role;
