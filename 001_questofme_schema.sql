-- QuestofMe (LPT) Supabase 스키마 마이그레이션
-- 실행 순서: 위에서 아래로 순차 실행
-- Supabase SQL Editor 또는 supabase migration 파일로 사용

-- =========================================
-- 1. profiles (auth.users 확장)
-- =========================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  birth_date date not null,
  birth_time time,
  birth_time_unknown boolean default false,
  gender text check (gender in ('male','female')),
  lpt_type text,
  fantasy_class text,
  kakao_linked boolean default false,
  email_linked boolean default false,
  notification_opt_in boolean default false,
  migrated_from_local boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table profiles is '사용자 프로필 - auth.users 1:1 확장';
comment on column profiles.migrated_from_local is '비회원(LocalStorage) 상태에서 가입 전환 시 true';

-- updated_at 자동 갱신 트리거
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- =========================================
-- 2. saju_reports (사주/설문 계산 결과)
-- =========================================
create table if not exists saju_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  saju_data jsonb not null,
  survey_scores jsonb not null,
  indicator_data jsonb not null,
  is_current boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_saju_reports_user_current
  on saju_reports(user_id, is_current);

-- 새 리포트 생성 시 기존 is_current를 false로 내리는 함수
create or replace function set_single_current_report()
returns trigger as $$
begin
  if new.is_current then
    update saju_reports
      set is_current = false
      where user_id = new.user_id and id != new.id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_saju_reports_single_current
  after insert on saju_reports
  for each row execute function set_single_current_report();

-- =========================================
-- 3. growth_stats
-- =========================================
create table if not exists growth_stats (
  user_id uuid primary key references profiles(id) on delete cascade,
  vitality int default 0,
  insight int default 0,
  harmony int default 0,
  endurance int default 0,
  total_xp int default 0,
  level int default 1,
  updated_at timestamptz default now()
);

create trigger trg_growth_stats_updated_at
  before update on growth_stats
  for each row execute function set_updated_at();

-- =========================================
-- 4. quest_logs
-- =========================================
create table if not exists quest_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  quest_id text not null,
  status text check (status in ('in_progress','completed')) default 'in_progress',
  xp_earned int default 0,
  completed_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, quest_id)
);

create index if not exists idx_quest_logs_user on quest_logs(user_id);

-- =========================================
-- 5. badges_earned
-- =========================================
create table if not exists badges_earned (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  badge_id text not null,
  earned_at timestamptz default now(),
  unique(user_id, badge_id)
);

create index if not exists idx_badges_earned_user on badges_earned(user_id);

-- =========================================
-- 6. share_cards
-- =========================================
create table if not exists share_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  card_type text check (card_type in ('character','level','badge')),
  ref_id text,
  image_url text,
  created_at timestamptz default now()
);

create index if not exists idx_share_cards_user on share_cards(user_id);

-- =========================================
-- 7. compatibility_results (Phase 2a)
-- =========================================
create table if not exists compatibility_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  partner_lpt_type text,
  partner_birth_data jsonb,
  result_data jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_compat_results_user on compatibility_results(user_id);

-- =========================================
-- 8. growth_history 뷰 (별도 테이블 불필요)
-- =========================================
create or replace view growth_history as
select user_id, 'quest'::text as event_type, quest_id as ref_id, completed_at as event_time
from quest_logs
where status = 'completed'
union all
select user_id, 'badge'::text as event_type, badge_id as ref_id, earned_at as event_time
from badges_earned;

-- =========================================
-- 9. RLS 활성화 및 정책
-- =========================================
alter table profiles enable row level security;
alter table saju_reports enable row level security;
alter table growth_stats enable row level security;
alter table quest_logs enable row level security;
alter table badges_earned enable row level security;
alter table share_cards enable row level security;
alter table compatibility_results enable row level security;

create policy "본인 프로필만 조회/수정" on profiles
  for all using (auth.uid() = id);

create policy "본인 사주리포트만 접근" on saju_reports
  for all using (auth.uid() = user_id);

create policy "본인 성장스탯만 접근" on growth_stats
  for all using (auth.uid() = user_id);

create policy "본인 퀘스트로그만 접근" on quest_logs
  for all using (auth.uid() = user_id);

create policy "본인 뱃지만 접근" on badges_earned
  for all using (auth.uid() = user_id);

create policy "본인 공유카드만 접근" on share_cards
  for all using (auth.uid() = user_id);

create policy "본인 궁합결과만 접근" on compatibility_results
  for all using (auth.uid() = user_id);

-- growth_history는 view이므로 기반 테이블의 RLS를 그대로 상속받음
-- (Postgres는 view 실행 시 호출자 권한이 아닌 정의 시점 규칙을 따르므로,
--  필요 시 security_invoker 옵션 적용 권장 — Postgres 15+)
alter view growth_history set (security_invoker = true);

-- =========================================
-- 10. 신규 가입 시 profiles 자동 생성 트리거
--     (auth.users insert 시 profiles row 미리 생성, 앱에서 update)
-- =========================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, birth_date, gender)
  values (new.id, '1900-01-01', null)  -- placeholder, 온보딩에서 실제 값으로 update
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
