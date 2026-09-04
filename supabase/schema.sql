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
  quest_log jsonb not null default '[]'::jsonb,  -- [{questId, completedAt}, ...]
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

-- ============================================================
-- 4. friendships: 초대 링크 방식 친구 관계 (Phase 2c)
--    검색으로 다른 사용자를 찾을 수 없다. 초대 링크를 공유하고 상대방이
--    로그인한 상태로 열어 수락해야만 친구가 된다.
-- ============================================================
create extension if not exists pgcrypto;

create table if not exists friendships (
  id bigint generated always as identity primary key,
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid references auth.users(id) on delete cascade,
  invite_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

alter table friendships enable row level security;

create policy "본인 관련 친구관계만 조회" on friendships
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "본인 초대만 생성" on friendships
  for insert with check (auth.uid() = requester_id);

create policy "초대 수락" on friendships
  for update
  using (status = 'pending' and addressee_id is null and auth.uid() <> requester_id)
  with check (auth.uid() = addressee_id and status = 'accepted');

create policy "친구의 프로필 조회 허용" on user_profiles
  for select using (
    exists (
      select 1 from friendships f
      where f.status = 'accepted'
        and (
          (f.requester_id = auth.uid() and f.addressee_id = user_profiles.user_id)
          or (f.addressee_id = auth.uid() and f.requester_id = user_profiles.user_id)
        )
    )
  );

-- ============================================================
-- 5. shared_profiles: 공유 링크로 "결과 보기 허용" 기능 (Phase 3)
--    사용자가 명시적으로 동의한 경우에만 생성되며, 공개 조회 가능하다.
--    생년월일·출생시간·성별 원본은 절대 저장하지 않는다.
-- ============================================================
create table if not exists shared_profiles (
  id text primary key,
  kind text not null,
  nickname text not null,
  heading text not null,
  subheading text not null,
  badge_label text not null,
  illustration_slug text,
  icon_element text,
  created_at timestamptz not null default now()
);

alter table shared_profiles enable row level security;

create policy "공유 프로필 공개 조회 허용" on shared_profiles
  for select using (true);

create policy "공유 프로필 생성 허용" on shared_profiles
  for insert with check (true);
