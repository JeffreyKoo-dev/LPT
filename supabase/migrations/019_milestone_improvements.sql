-- Phase 3 — 마일스톤 악용 방지 + 성장 보너스 2종 추가
--
-- 1) 친구초대 악용 방지: 구글/카카오 계정을 무의미하게 여러 개 만들어
--    서로 초대·수락만 하는 방식으로는 보상을 받을 수 없게 한다.
--    - 같은 상대방과 중복으로 친구관계가 생겨도 1명으로만 카운트
--      (count distinct)
--    - 상대방이 실제로 사주 분석을 완료한 계정(user_profiles.lpt_type_id
--      존재)일 때만 인정 — 빈 껍데기 계정으로는 카운트 안 됨. 가짜 계정을
--      만들어도 매번 생년월일 입력+설문까지 실제로 거쳐야 하므로, 대량
--      생성 비용이 커진다
--    - 상대방 계정이 생성된 지 최소 하루는 지나야 카운트 — 즉석 대량
--      생성 후 바로 수락하는 방식의 어뷰징을 늦춘다
--
-- 2) 성장 보너스 2종 추가: 레벨 달성, 뱃지 수집 — 친구초대 외에도
--    앱 안에서의 성장 자체로 재미있게 보상받을 수 있게 한다.

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
      and up.lpt_type_id is not null           -- 실제로 결과 계산까지 완료한 계정만
      and u.created_at < now() - interval '1 day';  -- 최소 하루는 지난 계정만

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
    select 'level_reached'::text, get_user_metric_value(v_user_id, 'level_reached')
    union all
    select 'badges_collected'::text, get_user_metric_value(v_user_id, 'badges_collected');
end;
$$;

insert into milestone_definitions (metric_type, threshold, reward_cash, title, description, sort_order)
values
  ('level_reached', 3,  300,  '레벨 3 달성', '퀘스트를 완료해 레벨 3을 달성하면 받을 수 있어요.', 1),
  ('level_reached', 5,  700,  '레벨 5 달성', '퀘스트를 완료해 레벨 5를 달성하면 받을 수 있어요.', 2),
  ('level_reached', 7,  1500, '레벨 7 달성', '퀘스트를 완료해 레벨 7을 달성하면 받을 수 있어요.', 3),
  ('level_reached', 10, 3500, '만렙(레벨 10) 달성', '퀘스트를 완료해 만렙을 달성하면 받을 수 있어요.', 4),
  ('badges_collected', 2, 300,  '뱃지 2개 수집', '뱃지 2개를 모으면 받을 수 있어요.', 1),
  ('badges_collected', 4, 800,  '뱃지 4개 수집', '뱃지 4개를 모으면 받을 수 있어요.', 2),
  ('badges_collected', 8, 2500, '뱃지 전체 수집', '뱃지 8개(전체)를 모두 모으면 받을 수 있어요.', 3)
on conflict (metric_type, threshold) do update set
  reward_cash = excluded.reward_cash,
  title       = excluded.title,
  description = excluded.description,
  sort_order  = excluded.sort_order;
