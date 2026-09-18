-- Phase 3 — 결제 취소·환불(차지백) 대응
--
-- 배경: 지금까지는 "결제 대기 중" 주문만 취소 처리했고, 이미 완료된
-- 결제가 나중에 취소·환불(카드사 차지백 등)되는 경우는 전혀 대응이
-- 없었다. 사용자가 보석을 받아 이미 AI 콘텐츠까지 소비한 뒤 결제를
-- 취소하면, 우리는 돈도 돌려주고 콘텐츠 원가도 이미 나간 채로 아무것도
-- 회수하지 못하는 구조였다.
--
-- 이 마이그레이션은: 1) 이미 완료된 주문이 취소되면 남아있는 보석만큼
-- 회수(이미 다 써버렸으면 회수 불가능한 만큼은 "미회수액"으로 기록),
-- 2) 관리자가 확인할 수 있도록 별도 로그 테이블에 남긴다.

create table if not exists payment_refund_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references purchase_orders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  krw_amount integer not null,
  cash_amount_granted integer not null,
  cash_amount_recovered integer not null,
  shortfall integer not null,   -- 이미 소비되어 회수하지 못한 금액
  reviewed boolean not null default false,
  created_at timestamptz not null default now(),
  unique(order_id)  -- 같은 주문에 대해 중복 처리 방지
);

alter table payment_refund_events enable row level security;
-- 클라이언트는 이 테이블에 접근할 필요가 없다 — 관리자 API(service_role)만
-- 사용한다. 별도 정책을 만들지 않아 RLS 기본값(전체 차단)을 그대로 둔다.

create or replace function process_payment_refund(p_order_id uuid)
returns table(recovered integer, shortfall integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_cash_balance integer;
  v_recovered integer;
  v_shortfall integer;
begin
  select * into v_order from purchase_orders where id = p_order_id and status = 'completed';
  if v_order is null then
    raise exception '완료된 주문을 찾을 수 없습니다: %', p_order_id;
  end if;

  if exists (select 1 from payment_refund_events where order_id = p_order_id) then
    raise exception '이미 처리된 환불입니다';
  end if;

  select cash_balance into v_cash_balance from wallets where user_id = v_order.user_id for update;

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

  update purchase_orders set status = 'cancelled' where id = p_order_id;

  insert into payment_refund_events(order_id, user_id, krw_amount, cash_amount_granted, cash_amount_recovered, shortfall)
  values (v_order.id, v_order.user_id, v_order.krw_amount, v_order.cash_amount, v_recovered, v_shortfall);

  return query select v_recovered, v_shortfall;
end;
$$;
