-- Phase 3 — 마일스톤 미션 (구간별 차등 보상)
--
-- 확장 가능한 설계: 미션 종류(metric_type)별로 여러 단계(threshold)와
-- 보상(reward_cash)을 정의해두고, 사용자의 실제 달성 현황은
-- get_user_metric_value()가 매번 서버에서 직접 계산한다 — 클라이언트가
-- "이만큼 달성했다"고 주장하는 값을 절대 신뢰하지 않는다.
--
-- 첫 미션은 "친구초대"만 구현한다. 나중에 다른 지표(레벨 달성, 결제
-- 누적 등)를 추가하려면: 1) get_user_metric_value()에 새 metric_type
-- 분기 추가, 2) milestone_definitions에 그 metric_type의 단계별 행
-- insert. 스키마 변경이나 앱 재배포 없이 SQL만으로 새 미션을 추가할 수
-- 있다(계산 로직 자체가 새 metric_type이면 함수 수정은 필요).

create table if not exists milestone_definitions (
  id bigint generated always as identity primary key,
  metric_type  text not null,       -- 'friend_invites' 등
  threshold    integer not null,     -- 이 수치를 넘어야 달성
  reward_cash  integer not null,
  title        text not null,
  description  text,
  sort_order   integer not null default 0,
  is_active    boolean not null default true,
  unique(metric_type, threshold)
);

alter table milestone_definitions enable row level security;

create policy "미션 목록은 로그인 사용자 모두 조회" on milestone_definitions
  for select using (auth.role() = 'authenticated');

create table if not exists user_milestone_claims (
  user_id      uuid not null references auth.users(id) on delete cascade,
  milestone_id bigint not null references milestone_definitions(id) on delete cascade,
  claimed_at   timestamptz not null default now(),
  primary key (user_id, milestone_id)
);

alter table user_milestone_claims enable row level security;

create policy "본인 수령 내역만 조회" on user_milestone_claims
  for select using (auth.uid() = user_id);

-- ============================================================
-- 지표별 현재 달성 수치를 서버에서 직접 계산한다 (클라이언트 값 불신)
-- ============================================================
create or replace function get_user_metric_value(p_user_id uuid, p_metric_type text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_value integer;
begin
  if p_metric_type = 'friend_invites' then
    select count(*) into v_value from friendships
      where requester_id = p_user_id and status = 'accepted';
  else
    v_value := 0;
  end if;
  return coalesce(v_value, 0);
end;
$$;

-- 로그인한 본인의 모든 지표 진행도를 한 번에 조회 (metric_type 늘어나면 union all로 추가)
create or replace function get_my_milestone_progress()
returns table(metric_type text, current_value integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return;
  end if;
  return query select 'friend_invites'::text, get_user_metric_value(v_user_id, 'friend_invites');
end;
$$;

-- ============================================================
-- 보상 수령: 자격(달성 여부 + 미수령 여부)을 서버가 재확인한 뒤에만 지급
-- ============================================================
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
  v_balance integer;
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

  insert into wallets(user_id, cash_balance) values (v_user_id, 0)
    on conflict (user_id) do nothing;

  update wallets set cash_balance = cash_balance + v_milestone.reward_cash, updated_at = now()
    where user_id = v_user_id
    returning cash_balance into v_balance;

  insert into wallet_transactions(user_id, type, amount, balance_after, description)
    values (v_user_id, 'refund', v_milestone.reward_cash, v_balance, v_milestone.title || ' 달성 보상');

  return query select v_balance, v_milestone.reward_cash;
end;
$$;

-- ============================================================
-- 친구초대 마일스톤 시드 — 많이 초대할수록 단계별로 보상이 커지는 구조
-- ============================================================
insert into milestone_definitions (metric_type, threshold, reward_cash, title, description, sort_order)
values
  ('friend_invites', 1,  200,  '첫 친구 초대', '친구 1명을 초대하면 받을 수 있어요.', 1),
  ('friend_invites', 3,  500,  '친구 3명 달성', '친구 3명을 초대하면 받을 수 있어요.', 2),
  ('friend_invites', 5,  1000, '친구 5명 달성', '친구 5명을 초대하면 받을 수 있어요.', 3),
  ('friend_invites', 10, 2500, '친구 10명 달성', '친구 10명을 초대하면 받을 수 있어요.', 4),
  ('friend_invites', 20, 6000, '친구 20명 달성', '친구 20명을 초대하면 받을 수 있어요.', 5)
on conflict (metric_type, threshold) do update set
  reward_cash = excluded.reward_cash,
  title       = excluded.title,
  description = excluded.description,
  sort_order  = excluded.sort_order;
