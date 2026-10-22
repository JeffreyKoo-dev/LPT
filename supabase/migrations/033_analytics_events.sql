-- 자체 이벤트 계측(가입→첫 결과→결제 화면→결제→공유 깔때기 측정용)
--
-- 외부 분석 도구 없이 서비스 개선에 필요한 최소한의 행동 이벤트만 저장한다.
-- 생년월일시·설문 응답·결과 내용 같은 개인정보는 props에 넣지 않는다
-- (상품 코드, 금액, 화면 경로 등만). 클라이언트는 직접 접근할 수 없고
-- /api/events(서버, service_role)만 insert한다.

create table if not exists analytics_events (
  id          bigint generated always as identity primary key,
  anon_id     text not null,
  user_id     uuid references auth.users(id) on delete set null,
  name        text not null,
  path        text,
  props       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_analytics_events_name_time on analytics_events(name, created_at desc);
create index if not exists idx_analytics_events_user on analytics_events(user_id, created_at desc);
create index if not exists idx_analytics_events_anon on analytics_events(anon_id, created_at desc);

alter table analytics_events enable row level security;
-- 정책 없음 = anon/authenticated 접근 불가. service_role만 RLS를 우회해 사용한다.
revoke all on analytics_events from anon, authenticated;

-- 최근 30일 결제 깔때기 (관리자가 SQL Editor에서 실행)
create or replace view analytics_funnel_30d as
select name, count(*) as events, count(distinct anon_id) as visitors
from analytics_events
where created_at > now() - interval '30 days'
group by name;

revoke all on analytics_funnel_30d from anon, authenticated;
