-- Phase 3 — 이탈 유저 재활성화(웰컴백 보너스)
--
-- 이메일/푸시 발송 인프라가 없어 "먼저 연락해서 데려오는" 방식은 못 쓴다.
-- 대신 오랫동안(30일+) 안 왔던 사용자가 스스로 돌아왔을 때 자동으로
-- 감지해 보너스를 주는 방식 — 별도 인프라 없이 로그인 순간에 처리된다.
--
-- auth.users.last_sign_in_at은 이번 로그인 시점에 이미 갱신돼버려서
-- "직전 로그인이 언제였는지" 판단 기준으로 못 쓴다. 대신 user_profiles에
-- 우리가 직접 관리하는 last_seen_at을 둬서, 갱신 "전에" 간격을 확인한다.

alter table user_profiles
  add column if not exists last_seen_at timestamptz;

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

  select last_seen_at into v_last_seen from user_profiles where user_id = v_user_id;

  -- 30일 이상 안 돌아왔던 경우에만 지급 (첫 방문은 last_seen_at이 null이라 제외됨 —
  -- 웰컴 보너스와 중복 지급 방지)
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
