-- Phase 3 — 전체 코드 리뷰에서 발견한 이슈 수정
--
-- 1) charge_cash_from_pg에 멱등성(중복 실행 방지) 보장이 없었다. 애플리케이션
--    레벨(/api/payments/confirm의 status='pending' 체크)만으로는 완전히
--    동시에 들어오는 두 요청을 막지 못한다(레이스 컨디션). DB 레벨 unique
--    제약으로 확실히 막는다 — 같은 결제(paymentKey)로 두 번 캐시가
--    지급되는 걸 원천 차단한다.

create unique index if not exists idx_wallet_tx_charge_reference
  on wallet_transactions(reference_id)
  where type = 'charge' and reference_id is not null;

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

  begin
    insert into wallet_transactions(user_id, type, amount, balance_after, reference_id, description)
    values (
      p_user_id, 'charge', p_cash_amount, v_balance, p_pg_transaction_id,
      format('%s원 결제 → %s캐시 충전', p_krw_amount, p_cash_amount)
    );
  exception when unique_violation then
    -- 같은 결제(paymentKey)가 이미 처리된 적 있다는 뜻 — 방금 더했던 캐시를
    -- 되돌리고, 기존에 처리됐던 잔액을 그대로 반환한다(중복 지급 방지).
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
