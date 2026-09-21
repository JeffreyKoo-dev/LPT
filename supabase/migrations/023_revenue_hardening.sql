-- Phase 3 — 수익모델 강화: 친구→결제전환 보상 + 재구매 리마인더 지원
--
-- 배경: 기존 친구초대 마일스톤은 "초대만 하면" 보상을 준다. 이건
-- 참여를 늘리는 데는 도움되지만, 실제 매출과는 직접 연결되지 않는다.
-- 초대한 친구가 "실제로 돈을 내고 보석을 충전"했을 때만 인정되는 새
-- 지표를 추가해, 추천 시스템이 실제 매출 성장에 더 직접 기여하게
-- 만든다. 기존 friend_invites 마일스톤은 그대로 유지(참여 자체도
-- 여전히 가치 있으므로), 이건 별개의 상위 마일스톤으로 추가한다.

create or replace function get_user_metric_value(p_user_id uuid, p_metric_type text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_value integer;
  v_xp integer;
begin
  if p_metric_type = 'friend_invites' then
    select count(distinct f.addressee_id) into v_value
    from friendships f
    join auth.users u on u.id = f.addressee_id
    join user_profiles up on up.user_id = f.addressee_id
    where f.requester_id = p_user_id
      and f.status = 'accepted'
      and up.lpt_type_id is not null
      and u.created_at < now() - interval '1 day';

  elsif p_metric_type = 'referred_paying_friends' then
    -- 초대해서 친구가 된 사람 중, 실제로 결제(충전)까지 한 사람 수.
    -- 계정 나이·결과 완료 조건은 이미 friend_invites 단계에서 걸러지므로
    -- 여기서는 "결제 여부"만 추가로 확인한다.
    select count(distinct f.addressee_id) into v_value
    from friendships f
    where f.requester_id = p_user_id
      and f.status = 'accepted'
      and exists (
        select 1 from wallet_transactions wt
        where wt.user_id = f.addressee_id and wt.type = 'charge' and wt.amount > 0
      );

  elsif p_metric_type = 'level_reached' then
    select xp into v_xp from user_profiles where user_id = p_user_id;
    v_value := case
      when coalesce(v_xp, 0) >= 2700 then 10
      when v_xp >= 2200 then 9
      when v_xp >= 1750 then 8
      when v_xp >= 1350 then 7
      when v_xp >= 1000 then 6
      when v_xp >= 700  then 5
      when v_xp >= 450  then 4
      when v_xp >= 250  then 3
      when v_xp >= 100  then 2
      else 1
    end;

  elsif p_metric_type = 'badges_collected' then
    select coalesce(array_length(badges, 1), 0) into v_value
    from user_profiles where user_id = p_user_id;

  else
    v_value := 0;
  end if;

  return coalesce(v_value, 0);
end;
$$;

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
  return query
    select 'friend_invites'::text, get_user_metric_value(v_user_id, 'friend_invites')
    union all
    select 'referred_paying_friends'::text, get_user_metric_value(v_user_id, 'referred_paying_friends')
    union all
    select 'level_reached'::text, get_user_metric_value(v_user_id, 'level_reached')
    union all
    select 'badges_collected'::text, get_user_metric_value(v_user_id, 'badges_collected');
end;
$$;

-- 결제까지 이어진 친구는 "초대만" 한 것보다 훨씬 가치가 크므로, 보상도
-- 그만큼 후하게 잡는다.
insert into milestone_definitions (metric_type, threshold, reward_cash, title, description, sort_order)
values
  ('referred_paying_friends', 1, 1000, '결제 전환 친구 1명', '내가 초대한 친구가 처음 결제하면 받을 수 있어요.', 1),
  ('referred_paying_friends', 3, 3000, '결제 전환 친구 3명', '내가 초대한 친구 3명이 결제하면 받을 수 있어요.', 2),
  ('referred_paying_friends', 5, 6000, '결제 전환 친구 5명', '내가 초대한 친구 5명이 결제하면 받을 수 있어요.', 3)
on conflict (metric_type, threshold) do update set
  reward_cash = excluded.reward_cash,
  title       = excluded.title,
  description = excluded.description,
  sort_order  = excluded.sort_order;
