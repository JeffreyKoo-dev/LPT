-- Phase 3 — 관리자 전용 기능
--
-- 운영 중 CS 대응(결제됐는데 캐시가 안 들어갔다는 문의 등)을 위해, 관리자가
-- 특정 사용자의 캐시를 수동으로 조정할 수 있는 함수. service_role
-- (/api/admin/* 라우트, lib/adminAuth.ts로 이메일 검증된 요청)에서만
-- 호출한다 — 일반 로그인 사용자는 절대 호출할 수 없다.

create or replace function admin_adjust_cash(
  p_user_id uuid,
  p_amount integer,       -- 양수면 지급, 음수면 차감
  p_reason text
)
returns table(new_balance integer)
language plpgsql
security definer
as $$
declare
  v_new_balance integer;
begin
  update wallets
    set cash_balance = cash_balance + p_amount,
        updated_at = now()
    where user_id = p_user_id
    returning cash_balance into v_new_balance;

  if v_new_balance is null then
    raise exception '지갑을 찾을 수 없습니다 (user_id: %)', p_user_id;
  end if;

  insert into wallet_transactions (user_id, type, amount, balance_after, description)
  values (
    p_user_id,
    case when p_amount >= 0 then 'refund' else 'spend' end,
    p_amount,
    v_new_balance,
    coalesce(p_reason, '관리자 수동 조정')
  );

  return query select v_new_balance;
end;
$$;

-- 일반 사용자는 이 함수를 직접 호출할 수 없다 (service_role만 실행 가능하도록 명시적으로 차단)
revoke execute on function admin_adjust_cash(uuid, integer, text) from public, authenticated, anon;
