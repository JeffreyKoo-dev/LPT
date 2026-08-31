-- Phase 3 — 콘텐츠 감수(Audit) 신고 테이블
-- 종교·성적 비하·인종·장애 등 문제 소지가 있는 입력이 감지되면 여기에 기록된다.
-- 관리자만 조회 가능하도록 select 정책을 만들지 않는다 (RLS 기본값: 전체 차단).

create table if not exists moderation_reports (
  id bigint generated always as identity primary key,
  field_name text not null,          -- 예: "nickname"
  content_snippet text not null,     -- 문제로 판단된 원문 (전체를 저장하되 개인 식별 정보는 아님)
  category text not null,            -- 예: "religious" | "sexual" | "racial" | "disability" | "other"
  severity text not null default 'flagged', -- 'flagged' | 'blocked'
  user_id uuid references auth.users(id) on delete set null, -- 있으면 참고용, 없어도 무방
  created_at timestamptz not null default now()
);

alter table moderation_reports enable row level security;

-- 클라이언트/Edge Function이 insert만 가능하게 한다. select는 만들지 않아
-- 클라이언트에서는 조회 자체가 불가능하다 (관리자는 대시보드에서 service_role로 조회).
create policy "감수 신고 insert만 허용" on moderation_reports
  for insert with check (true);
