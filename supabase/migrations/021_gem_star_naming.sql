-- Phase 3 — "캐시" 용어를 "보석"/"별조각"으로 전면 교체
--
-- 배경: "캐시"라는 표현이 법적으로 민감할 수 있고(선불전자지급수단 등
-- 관련 규제 용어와 혼동 소지), 실제캐시/보너스캐시라는 이름도 사용자
-- 입장에서 헷갈린다는 지적이 있었다. 화면 UI는 이미 전부 정리했는데,
-- DB 함수가 거래내역에 남기는 설명 문구와 에러 메시지에는 "캐시"가
-- 그대로 남아있어 실제 화면(최근 거래 내역)에 노출되고 있었다 — 이걸
-- 마저 정리한다.
--
-- 이름: 보석(구매로 충전, 모든 상품 결제 가능) / 별조각(무료 지급,
-- AI 원가 있는 상품에는 쓸 수 없음)

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
  insert into wallets(user_id, cash_balance) values (p_user_id, 0)
    on conflict (user_id) do nothing;

  update wallets set cash_balance = cash_balance + p_cash_amount, updated_at = now()
  where user_id = p_user_id
  returning cash_balance into v_balance;

  begin
    insert into wallet_transactions(user_id, type, amount, balance_after, reference_id, description)
    values (
      p_user_id, 'charge', p_cash_amount, v_balance, p_pg_transaction_id,
      format('%s원 결제 → 보석 %s개 충전', p_krw_amount, p_cash_amount)
    );
  exception when unique_violation then
    update wallets set cash_balance = cash_balance - p_cash_amount, updated_at = now()
    where user_id = p_user_id;

    select balance_after into v_balance
    from wallet_transactions
    where reference_id = p_pg_transaction_id and type = 'charge'
    limit 1;
  end;

  return query select v_balance;
end;
$$;

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
  values (v_user_id, 'ad_reward', p_reward_amount, v_cash_balance, v_bonus_balance, '리워드 광고 시청 별조각 적립');

  return query select v_bonus_balance + v_cash_balance, (2 - v_today_count);
end;
$$;

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
  values (new.id, 'refund', 500, 0, 500, '신규 가입 웰컴 별조각');

  return new;
end;
$$;

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
    values (v_user_id, 'refund', v_milestone.reward_cash, v_cash_balance, v_bonus_balance, v_milestone.title || ' 달성 별조각');

  return query select v_bonus_balance + v_cash_balance, v_milestone.reward_cash;
end;
$$;

-- 이미 쌓인 거래내역(테스트 데이터 포함)의 설명 문구도 일괄 정리한다.
update wallet_transactions set description = replace(description, '캐시 결제로 콘텐츠 해제', '보석 결제로 콘텐츠 해제')
  where description like '%캐시 결제로 콘텐츠 해제%';
update wallet_transactions set description = '보석 결제'
  where description = '캐시 결제';
update wallet_transactions set description = replace(description, '보너스캐시', '별조각')
  where description like '%보너스캐시%';
update wallet_transactions set description = regexp_replace(description, '(\d+)원 결제 → (\d+)캐시 충전', '\1원 결제 → 보석 \2개 충전')
  where description ~ '캐시 충전';
