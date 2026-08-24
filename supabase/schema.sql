-- LPT Phase 2b — Supabase 스키마
-- Supabase 대시보드 → SQL Editor에 이 파일 내용을 그대로 붙여넣고 실행하세요.
-- 설계 배경은 docs/PHASE2_ROADMAP.md의 "3. 개인정보 정책" 참고.

-- ============================================================
-- 1. user_profiles: 회원 프로필. 생년월일시·성별 컬럼이 없다 (의도적).
-- ============================================================
create table if not exists user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  lpt_type_id text,                          -- 계산 "결과"만 저장 (원본 생년월일시 아님)
  xp integer not null default 0,
  stats jsonb not null default '{}'::jsonb,
  badges text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_profiles enable row level security;

create policy "본인 프로필만 조회" on user_profiles
  for select using (auth.uid() = user_id);

create policy "본인 프로필만 수정" on user_profiles
  for update using (auth.uid() = user_id);

create policy "본인 프로필만 생성" on user_profiles
  for insert with check (auth.uid() = user_id);

-- ============================================================
-- 2. survey_responses: 36문항 응답 (본인 결과 재계산/이력 확인용)
-- ============================================================
create table if not exists survey_responses (
  user_id uuid primary key references auth.users(id) on delete cascade,
  answers jsonb not null,                    -- [{questionId, value}, ...]
  computed_at timestamptz not null default now()
);

alter table survey_responses enable row level security;

create policy "본인 응답만 조회" on survey_responses
  for select using (auth.uid() = user_id);

create policy "본인 응답만 저장" on survey_responses
  for insert with check (auth.uid() = user_id);

create policy "본인 응답만 수정" on survey_responses
  for update using (auth.uid() = user_id);

-- ============================================================
-- 3. birth_stats: 익명 통계 전용. 계정과 연결되는 컬럼이 없다 (의도적).
--    클라이언트는 insert만 가능하고 select는 불가능하게 막아, 저장 후에는
--    누구도(관리자 제외) 개별 레코드를 다시 조회해 계정과 연결지을 수 없다.
-- ============================================================
create table if not exists birth_stats (
  id bigint generated always as identity primary key,
  birth_date date not null,
  birth_time time,                           -- 모르면 null
  gender text not null,
  calendar_type text not null,
  lpt_type_id text not null,
  created_at timestamptz not null default now()
);

alter table birth_stats enable row level security;

-- 익명 사용자도 insert만 가능 (통계 수집), select/update/delete는 아무도 불가
create policy "익명 insert만 허용" on birth_stats
  for insert with check (true);

-- select 정책을 만들지 않으면 기본적으로 전체 차단된다 (RLS 기본값: deny all).
-- 통계 조회가 필요하면 Supabase 대시보드에서 service_role 키로 직접 조회하거나,
-- 별도의 관리자 전용 Edge Function을 통해서만 접근하도록 한다.

-- ============================================================
-- updated_at 자동 갱신 트리거
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger user_profiles_updated_at
  before update on user_profiles
  for each row execute function set_updated_at();
