-- Phase 3 — 캐시 충전 단위(보너스율)를 코드 하드코딩에서 DB로 이전
--
-- 프로모션 실험(충전 이벤트, 한시적 보너스율 변경 등)을 코드 재배포 없이
-- SQL 한 줄로 할 수 있게 한다.

create table if not exists cash_charge_options (
  krw_amount  integer primary key,
  cash_amount integer not null,   -- 보너스 포함 지급 캐시
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  updated_at  timestamptz not null default now()
);

alter table cash_charge_options enable row level security;

create policy "충전 단위는 로그인 사용자 모두 조회" on cash_charge_options
  for select using (auth.role() = 'authenticated');

insert into cash_charge_options (krw_amount, cash_amount, sort_order)
values
  (1000, 1000, 1),
  (3000, 3300, 2),
  (5000, 5750, 3),
  (10000, 12000, 4)
on conflict (krw_amount) do update set
  cash_amount = excluded.cash_amount,
  sort_order  = excluded.sort_order,
  updated_at  = now();
