-- Phase 3 — 2차 코드 리뷰에서 발견한 이슈 수정
--
-- 1) purchase_product()가 compatibility_bundle_3 / weekly_pass도 받아들일
--    수 있는 구조였다. 지금은 이 두 상품을 파는 화면이 전부 전용 함수
--    (purchase_compatibility_bundle, purchase_weekly_pass)로만 연결되어
--    있어 실제 문제는 없지만, 나중에 실수로 범용 구매 카드(PremiumUnlockCard)에
--    이 product_code를 연결하면 "결제는 되는데 실제 혜택(궁합권·이용권)은
--    지급 안 되는" 위험한 버그가 생길 수 있다. 범용 함수에서 이 두 상품은
--    명시적으로 거부해 애초에 그런 실수가 불가능하게 만든다.
--
-- 2) check_winback_bonus()에 레이스 컨디션이 있었다 — 여러 탭에서 거의
--    동시에 로그인하면, 둘 다 "지급 전 상태"를 읽고 각각 지급해버릴 수
--    있었다(잠금 없이 조회 후 나중에 갱신). user_profiles 조회에 for
--    update를 추가해 동시 호출이 순차 처리되게 한다.

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

  if p_product_code in ('compatibility_bundle_3', 'weekly_pass') then
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

create or replace function check_winback_bonus()
returns table(granted boolean, bonus_amount integer, new_balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_last_seen timestamptz;
  v_bonus integer := 300;
  v_bonus_balance integer;
  v_cash_balance integer;
  v_granted boolean := false;
begin
  if v_user_id is null then
    raise exception '인증되지 않은 요청입니다';
  end if;

  -- for update로 잠가서, 여러 탭에서 거의 동시에 로그인해도 한 번만 지급되게 한다
  select last_seen_at into v_last_seen from user_profiles where user_id = v_user_id for update;

  if v_last_seen is not null and v_last_seen < now() - interval '30 days' then
    update wallets set bonus_balance = bonus_balance + v_bonus, updated_at = now()
      where user_id = v_user_id
      returning bonus_balance, cash_balance into v_bonus_balance, v_cash_balance;

    if found then
      insert into wallet_transactions(user_id, type, amount, balance_after, bonus_balance_after, description)
      values (v_user_id, 'refund', v_bonus, v_cash_balance, v_bonus_balance, '오랜만이에요 웰컴백 별조각');
      v_granted := true;
    end if;
  end if;

  update user_profiles set last_seen_at = now() where user_id = v_user_id;

  return query select v_granted, case when v_granted then v_bonus else 0 end, coalesce(v_bonus_balance, 0);
end;
$$;
