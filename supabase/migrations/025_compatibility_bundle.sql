-- Phase 3 — 심층 궁합 분석 3인 세트 번들 할인
--
-- 심층 궁합 분석은 상대가 바뀔 때마다 재구매 가능한(관계마다 확인) 좋은
-- 반복 상품이지만, 지금까지는 묶음 구매 유인이 없었다. 3건을 한 번에
-- 싸게 사는 "궁합권"을 도입해 객단가를 올린다.

create table if not exists compatibility_vouchers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  remaining_count integer not null default 0 check (remaining_count >= 0),
  updated_at timestamptz not null default now()
);

alter table compatibility_vouchers enable row level security;

create policy "본인 궁합권만 조회" on compatibility_vouchers
  for select using (auth.uid() = user_id);

insert into product_prices (product_code, display_name, cash_price, ai_model, ad_unlockable, is_active)
values
  ('compatibility_bundle_3', '심층 궁합 분석 3인 세트', 6000, 'haiku-4.5', false, true)
on conflict (product_code) do update set
  display_name  = excluded.display_name,
  cash_price    = excluded.cash_price,
  ai_model      = excluded.ai_model,
  ad_unlockable = excluded.ad_unlockable,
  is_active     = excluded.is_active,
  updated_at    = now();

-- 번들 구매: 실제캐시(보석)로 결제하고 궁합권 3개를 적립한다.
create or replace function purchase_compatibility_bundle()
returns table(new_balance integer, vouchers integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_price integer;
  v_cash_balance integer;
  v_vouchers integer;
begin
  if v_user_id is null then
    raise exception '인증되지 않은 요청입니다';
  end if;

  select cash_price into v_price from product_prices
  where product_code = 'compatibility_bundle_3' and is_active = true;
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
  values (v_user_id, 'spend', -v_price, v_cash_balance, 'compatibility_bundle_3', '심층 궁합 분석 3인 세트 구매');

  insert into compatibility_vouchers(user_id, remaining_count)
  values (v_user_id, 3)
  on conflict (user_id) do update set remaining_count = compatibility_vouchers.remaining_count + 3, updated_at = now();

  select remaining_count into v_vouchers from compatibility_vouchers where user_id = v_user_id;

  return query select v_cash_balance, v_vouchers;
end;
$$;

-- 궁합권 1개를 소모하고(있을 때만) 성공 여부를 반환한다. 결제(캐시 차감) 없이
-- 진행되므로, 이미 번들로 결제가 끝난 상태를 소비하는 것뿐이다.
create or replace function redeem_compatibility_voucher()
returns table(redeemed boolean, remaining integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_remaining integer;
begin
  if v_user_id is null then
    raise exception '인증되지 않은 요청입니다';
  end if;

  select remaining_count into v_remaining from compatibility_vouchers
    where user_id = v_user_id for update;

  if coalesce(v_remaining, 0) <= 0 then
    return query select false, coalesce(v_remaining, 0);
    return;
  end if;

  update compatibility_vouchers set remaining_count = remaining_count - 1, updated_at = now()
    where user_id = v_user_id
    returning remaining_count into v_remaining;

  return query select true, v_remaining;
end;
$$;
