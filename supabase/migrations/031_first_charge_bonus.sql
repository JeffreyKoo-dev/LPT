-- Phase 3 — 첫 결제 보너스
--
-- 웰컴 보너스(017/020)로 무료 체험까지는 이어지지만, 첫 결제로 넘어가는 마지막
-- 허들이 남아 있다. 사용자별 "첫 번째 충전"에 한해 별조각(bonus_balance) 300개를
-- 추가로 지급한다.
--
-- - 보너스는 무료 지급 재화이므로 bonus_balance로 적립한다(020 정책과 동일: AI 원가가
--   있는 상품에는 쓸 수 없음).
-- - 멱등성: 같은 결제(pg_transaction_id)가 재실행되면 거래내역 insert가 unique 위반으로
--   떨어지는 기존 경로를 그대로 타고, 이때는 보너스를 다시 주지 않는다.
-- - 첫 결제 여부는 wallet_transactions의 type='charge' 기록 유무로 판단한다.

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
  v_bonus_balance integer;
  v_first boolean;
  v_first_bonus constant integer := 300;
begin
  insert into wallets(user_id, cash_balance) values (p_user_id, 0)
    on conflict (user_id) do nothing;

  -- 같은 사용자의 동시 결제가 보너스를 중복 지급하지 않도록 지갑 행을 잠근다
  perform 1 from wallets where user_id = p_user_id for update;

  select not exists (
    select 1 from wallet_transactions where user_id = p_user_id and type = 'charge'
  ) into v_first;

  update wallets set cash_balance = cash_balance + p_cash_amount, updated_at = now()
  where user_id = p_user_id
  returning cash_balance into v_balance;

  begin
    insert into wallet_transactions(user_id, type, amount, balance_after, reference_id, description)
    values (
      p_user_id, 'charge', p_cash_amount, v_balance, p_pg_transaction_id,
      format('%s원 결제 → 보석 %s개 충전', p_krw_amount, p_cash_amount)
    );

    if v_first then
      update wallets set bonus_balance = bonus_balance + v_first_bonus, updated_at = now()
      where user_id = p_user_id
      returning bonus_balance into v_bonus_balance;

      insert into wallet_transactions(user_id, type, amount, balance_after, bonus_balance_after, description)
      values (p_user_id, 'refund', v_first_bonus, v_balance, v_bonus_balance, '첫 결제 기념 별조각');
    end if;
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

revoke all on function charge_cash_from_pg from public;
revoke all on function charge_cash_from_pg from authenticated;
grant execute on function charge_cash_from_pg to service_role;
