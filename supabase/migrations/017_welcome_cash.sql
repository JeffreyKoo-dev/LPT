-- Phase 3 — 신규 가입 웰컴 캐시 (첫 구매 전환 유도)
--
-- 가입 직후 잔액이 0이면 유료 콘텐츠를 한 번도 체험 안 해보고 이탈할
-- 가능성이 높다. 가입만 해도 500캐시를 바로 지급해, "오늘의 카드"
-- (500원)는 무료 체험 가능하고 "이번 달 운세"(700원)는 200원만 충전
-- 하면 되는 정도의 낮은 진입장벽을 만든다.

create or replace function handle_new_user_wallet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into wallets(user_id, cash_balance) values (new.id, 500)
  on conflict (user_id) do nothing;

  insert into wallet_transactions(user_id, type, amount, balance_after, description)
  values (new.id, 'refund', 500, 500, '신규 가입 웰컴 캐시');

  return new;
end;
$$;
