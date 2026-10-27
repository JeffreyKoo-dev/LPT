-- 신년 시즌 상품: 신년 패키지(신년운세 + 궁합 심화 1회)
--
-- * 상품 행은 비활성(is_active=false)으로 만든다. 공개일(12/1)에 아래 한 줄로 켠다:
--     update product_prices set is_active = true, updated_at = now() where product_code = 'newyear_pack';
--   시즌이 끝나면(2/15) false로 되돌린다. 화면은 이 활성 여부로만 노출을 결정한다.
-- * 구매하면 보석을 차감하고, 지금 파는 대상 연도의 신년운세 구매 기록(yearly_fortune)을 남기며,
--   궁합권 1개를 적립한다. 신년운세 구매 기록은 "대상 연도 결제 인정 기간(Y-1년 12/1 ~ Y년 12/1, KST)"
--   안에 있으면 유효하다 (src/lib/kst.ts getFortuneYearWindow와 같은 기준).
-- * 패키지 매출은 wallet_transactions에서 product_code='yearly_fortune', 설명 '신년 패키지 구매'로
--   남는다(금액 4,900원). 관리자 상품별 매출에서는 신년운세에 합산돼 보인다.
-- * purchase_product()는 이 상품을 거부하도록 갱신한다(전용 함수로만 구매).

insert into product_prices (product_code, display_name, cash_price, ai_model, ad_unlockable, is_active)
values
  ('newyear_pack', '신년 패키지 (신년운세 + 궁합 심화 1회)', 4900, 'haiku-4.5', false, false)
on conflict (product_code) do update set
  display_name  = excluded.display_name,
  cash_price    = excluded.cash_price,
  ai_model      = excluded.ai_model,
  ad_unlockable = excluded.ad_unlockable,
  updated_at    = now();
  -- is_active는 일부러 갱신하지 않는다: 이미 켠 뒤 이 파일을 다시 실행해도 꺼지지 않게.

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

  if p_product_code in ('compatibility_bundle_3', 'weekly_pass', 'newyear_pack') then
    raise exception '% 상품은 전용 구매 함수를 써야 합니다', p_product_code;
  end if;

  select cash_price, is_active, ad_unlockable into v_price, v_is_active, v_ad_unlockable
  from product_prices where product_code = p_product_code;

  if not found or not v_is_active then
    raise exception '존재하지 않거나 비활성화된 상품입니다: %', p_product_code;
  end if;

  select bonus_balance, cash_balance into v_bonus_balance, v_cash_balance from wallets
  where user_id = v_user_id for update;

  if v_ad_unlockable then
    if (v_bonus_balance + v_cash_balance) < v_price then
      raise exception '자산이 부족합니다 (보유: %, 필요: %)', v_bonus_balance + v_cash_balance, v_price;
    end if;
    v_from_bonus := least(v_bonus_balance, v_price);
    v_from_cash := v_price - v_from_bonus;
  else
    if v_cash_balance < v_price then
      raise exception '이 상품은 보석으로만 결제할 수 있어요 (보유 보석: %, 필요: %)', v_cash_balance, v_price;
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
  values (v_user_id, 'spend', -v_price, v_cash_balance, v_bonus_balance, p_product_code, p_reference_id, '보석 결제');

  return query select v_bonus_balance + v_cash_balance;
end;
$$;


create or replace function purchase_newyear_pack()
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
  v_kst timestamp := now() at time zone 'Asia/Seoul';
  v_target_year integer;
  v_window_start timestamptz;
  v_window_end timestamptz;
begin
  if v_user_id is null then
    raise exception '인증되지 않은 요청입니다';
  end if;

  select cash_price into v_price from product_prices
  where product_code = 'newyear_pack' and is_active = true;
  if v_price is null then
    raise exception '지금은 판매하지 않는 상품입니다';
  end if;

  -- 대상 연도: 12월부터는 다음 해 (lib/kst.ts getFortuneYear와 동일)
  v_target_year := extract(year from v_kst)::integer + case when extract(month from v_kst) = 12 then 1 else 0 end;
  v_window_start := make_timestamptz(v_target_year - 1, 12, 1, 0, 0, 0, 'Asia/Seoul');
  v_window_end   := make_timestamptz(v_target_year, 12, 1, 0, 0, 0, 'Asia/Seoul');

  select cash_balance into v_cash_balance from wallets where user_id = v_user_id for update;

  -- 같은 해 신년운세를 이미 샀다면 패키지로 또 결제하지 않게 막는다(이중 결제 방지)
  if exists (
    select 1 from wallet_transactions
    where user_id = v_user_id and product_code = 'yearly_fortune' and type = 'spend'
      and created_at >= v_window_start and created_at < v_window_end
  ) then
    raise exception '이미 이번 해 신년운세를 구매하셨어요. 궁합 심화는 따로 구매할 수 있어요';
  end if;

  if coalesce(v_cash_balance, 0) < v_price then
    raise exception '보석이 부족합니다 (보유: %, 필요: %)', coalesce(v_cash_balance, 0), v_price;
  end if;

  update wallets set cash_balance = cash_balance - v_price, updated_at = now()
    where user_id = v_user_id
    returning cash_balance into v_cash_balance;

  insert into wallet_transactions(user_id, type, amount, balance_after, product_code, description)
  values (v_user_id, 'spend', -v_price, v_cash_balance, 'yearly_fortune', '신년 패키지 구매');

  insert into compatibility_vouchers(user_id, remaining_count)
  values (v_user_id, 1)
  on conflict (user_id) do update set remaining_count = compatibility_vouchers.remaining_count + 1, updated_at = now();

  select remaining_count into v_vouchers from compatibility_vouchers where user_id = v_user_id;

  return query select v_cash_balance, v_vouchers;
end;
$$;

revoke all on function purchase_newyear_pack() from public, anon;
grant execute on function purchase_newyear_pack() to authenticated;
