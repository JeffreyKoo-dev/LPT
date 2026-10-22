-- Phase 3 — 첫 결제 보너스 회수 (환불 어뷰징 방지)
--
-- 031에서 첫 결제 시 별조각(bonus_balance) 300개를 지급하기 시작했다. 그런데
-- process_payment_refund는 보석(cash_balance)만 회수해서, "첫 결제 → 보너스 수령 →
-- 환불"을 반복하면 보너스가 남는 구멍이 있었다. 이 마이그레이션은:
-- 1) 첫 결제 보너스 거래에 결제 식별자를 남겨(reference_id = 'first-charge:<paymentKey>')
--    어느 결제에서 나온 보너스인지 추적할 수 있게 하고,
-- 2) 결제가 취소되면 그 보너스 중 아직 남아있는 만큼을 함께 회수한다.
--
-- 보너스 거래의 type은 'refund'(무상 지급 표기)라 014의 charge 전용 unique index와
-- 충돌하지 않는다.

alter table payment_refund_events
  add column if not exists bonus_recovered integer not null default 0;

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

      insert into wallet_transactions(user_id, type, amount, balance_after, bonus_balance_after, reference_id, description)
      values (
        p_user_id, 'refund', v_first_bonus, v_balance, v_bonus_balance,
        'first-charge:' || p_pg_transaction_id, '첫 결제 기념 별조각'
      );
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

create or replace function process_payment_refund(p_order_id uuid)
returns table(recovered integer, shortfall integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_cash_balance integer;
  v_bonus_balance integer;
  v_recovered integer;
  v_shortfall integer;
  v_bonus_granted integer;
  v_bonus_recovered integer := 0;
begin
  select * into v_order from purchase_orders where id = p_order_id and status = 'completed';
  if v_order is null then
    raise exception '완료된 주문을 찾을 수 없습니다: %', p_order_id;
  end if;

  if exists (select 1 from payment_refund_events where order_id = p_order_id) then
    raise exception '이미 처리된 환불입니다';
  end if;

  select cash_balance, bonus_balance into v_cash_balance, v_bonus_balance
  from wallets where user_id = v_order.user_id for update;

  v_recovered := least(coalesce(v_cash_balance, 0), v_order.cash_amount);
  v_shortfall := v_order.cash_amount - v_recovered;

  update wallets set cash_balance = cash_balance - v_recovered, updated_at = now()
    where user_id = v_order.user_id;

  insert into wallet_transactions(user_id, type, amount, balance_after, reference_id, description)
  values (
    v_order.user_id, 'spend', -v_recovered,
    coalesce(v_cash_balance, 0) - v_recovered,
    v_order.pg_transaction_id,
    '결제 취소로 인한 보석 회수'
  );

  -- 이 결제에서 지급된 첫 결제 보너스가 있으면, 남아있는 만큼 회수한다
  select amount into v_bonus_granted
  from wallet_transactions
  where user_id = v_order.user_id
    and reference_id = 'first-charge:' || v_order.pg_transaction_id
  limit 1;

  if v_bonus_granted is not null and v_bonus_granted > 0 then
    v_bonus_recovered := least(coalesce(v_bonus_balance, 0), v_bonus_granted);
    if v_bonus_recovered > 0 then
      update wallets set bonus_balance = bonus_balance - v_bonus_recovered, updated_at = now()
        where user_id = v_order.user_id;

      insert into wallet_transactions(user_id, type, amount, balance_after, bonus_balance_after, description)
      values (
        v_order.user_id, 'spend', -v_bonus_recovered,
        coalesce(v_cash_balance, 0) - v_recovered,
        coalesce(v_bonus_balance, 0) - v_bonus_recovered,
        '결제 취소로 인한 첫 결제 보너스 회수'
      );
    end if;
  end if;

  update purchase_orders set status = 'cancelled' where id = p_order_id;

  insert into payment_refund_events(
    order_id, user_id, krw_amount, cash_amount_granted, cash_amount_recovered, shortfall, bonus_recovered
  )
  values (
    v_order.id, v_order.user_id, v_order.krw_amount, v_order.cash_amount,
    v_recovered, v_shortfall, v_bonus_recovered
  );

  return query select v_recovered, v_shortfall;
end;
$$;

revoke all on function process_payment_refund from public;
revoke all on function process_payment_refund from authenticated;
grant execute on function process_payment_refund to service_role;
