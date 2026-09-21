-- Phase 3 — 주간 이용권 (오늘의 카드 무제한, 단순 정기구독 대체안)
--
-- 진짜 자동결제(정기 빌링)는 별도 인프라(토스 빌링키, 주기적 과금 트리거)가
-- 필요해 위험도가 높다. 대신 "일정 기간 이용권을 미리 사두는" 방식으로
-- 구독과 비슷한 편의를 주되, 매번 사용자가 직접 갱신하게 한다 — 결제
-- 로직은 기존 구매 인프라를 그대로 재사용할 수 있어 훨씬 안전하다.

create table if not exists active_passes (
  user_id    uuid not null references auth.users(id) on delete cascade,
  pass_type  text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  primary key (user_id, pass_type)
);

alter table active_passes enable row level security;

create policy "본인 이용권만 조회" on active_passes
  for select using (auth.uid() = user_id);

insert into product_prices (product_code, display_name, cash_price, ai_model, ad_unlockable, is_active)
values
  ('weekly_pass', '주간 이용권(오늘의 카드 무제한)', 2900, null, false, true)
on conflict (product_code) do update set
  display_name  = excluded.display_name,
  cash_price    = excluded.cash_price,
  ad_unlockable = excluded.ad_unlockable,
  is_active     = excluded.is_active,
  updated_at    = now();

create or replace function purchase_weekly_pass()
returns table(new_balance integer, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_price integer;
  v_cash_balance integer;
  v_current_expiry timestamptz;
  v_new_expiry timestamptz;
begin
  if v_user_id is null then
    raise exception '인증되지 않은 요청입니다';
  end if;

  select cash_price into v_price from product_prices
  where product_code = 'weekly_pass' and is_active = true;
  if v_price is null then
    raise exception '상품을 찾을 수 없습니다';
  end if;

  select cash_balance into v_cash_balance from wallets where user_id = v_user_id for update;
  if coalesce(v_cash_balance, 0) < v_price then
    raise exception '보석이 부족합니다 (보유: %, 필요: %)', coalesce(v_cash_balance, 0), v_price;
  end if;

  update wallets set cash_balance = cash_balance - v_price, updated_at = now()
    where user_id = v_user_id
    returning cash_balance into v_cash_balance;

  insert into wallet_transactions(user_id, type, amount, balance_after, product_code, description)
  values (v_user_id, 'spend', -v_price, v_cash_balance, 'weekly_pass', '주간 이용권 구매');

  -- 이미 유효한 이용권이 남아있으면 그 만료일부터 7일 연장, 없으면 지금부터 7일
  select expires_at into v_current_expiry from active_passes
    where user_id = v_user_id and pass_type = 'weekly_pass';

  v_new_expiry := greatest(coalesce(v_current_expiry, now()), now()) + interval '7 days';

  insert into active_passes(user_id, pass_type, expires_at)
  values (v_user_id, 'weekly_pass', v_new_expiry)
  on conflict (user_id, pass_type) do update set expires_at = v_new_expiry;

  return query select v_cash_balance, v_new_expiry;
end;
$$;

-- 일일 콘텐츠 해제: 유효한 주간 이용권이 있으면(daily_card_unlock 한정)
-- 결제 없이 자동으로 통과시킨다.
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
  v_has_pass boolean;
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

  -- 주간 이용권이 유효하면 daily_card_unlock은 결제·광고 없이 바로 통과
  if p_product_code = 'daily_card_unlock' then
    select exists (
      select 1 from active_passes
      where user_id = v_user_id and pass_type = 'weekly_pass' and expires_at > now()
    ) into v_has_pass;

    if v_has_pass then
      insert into daily_unlocks(user_id, product_code, method)
      values (v_user_id, p_product_code, 'ad'); -- 이용권도 '무료 해제' 계열로 기록

      select bonus_balance + cash_balance into v_bonus_balance from wallets where user_id = v_user_id;
      return query select true, coalesce(v_bonus_balance, 0);
      return;
    end if;
  end if;

  if p_method = 'ad' then
    if not v_ad_unlockable then
      raise exception '이 콘텐츠는 광고로 해제할 수 없습니다. 보석으로 결제해주세요.';
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
      raise exception '자산이 부족합니다 (보유: %, 필요: %)', v_bonus_balance + v_cash_balance, v_price;
    end if;

    if not v_ad_unlockable then
      if v_cash_balance < v_price then
        raise exception '이 상품은 보석으로만 결제할 수 있어요 (보유 보석: %, 필요: %)', v_cash_balance, v_price;
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
    values (v_user_id, 'spend', -v_price, v_cash_balance, v_bonus_balance, p_product_code, '결제로 콘텐츠 해제');

    insert into daily_unlocks(user_id, product_code, method)
    values (v_user_id, p_product_code, 'cash');

    return query select true, v_bonus_balance + v_cash_balance;
  else
    raise exception '잘못된 해제 방식입니다: %', p_method;
  end if;
end;
$$;
