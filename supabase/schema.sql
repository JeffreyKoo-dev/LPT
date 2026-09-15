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
  analysis_report jsonb,                      -- 계산된 사주 분석 리포트(원본 생년월일시 미포함, 파생값만)
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
-- ============================================================
-- LPT(QuestofME) 캐시 결제/광고 리워드 시스템 — 스키마
-- 설계 원칙:
--   1) 잔액 변경은 오직 SECURITY DEFINER 함수를 통해서만 발생
--      (클라이언트가 직접 wallets/wallet_transactions에 쓰기 불가)
--   2) 광고 리워드는 하루 3회로 상한 (캐시 매출 잠식 방지)
--   3) AI 호출이 들어가는 유료 콘텐츠는 광고로 해제 불가
--      (product_prices.ad_unlockable = false)
-- ============================================================

-- 1. 지갑 (캐시 잔액)
create table if not exists wallets (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  cash_balance integer not null default 0 check (cash_balance >= 0),
  updated_at   timestamptz not null default now()
);

-- 2. 거래 내역 (충전/차감/광고적립 전체 로그 — 감사 추적용)
create type wallet_tx_type as enum ('charge', 'spend', 'ad_reward', 'refund');

create table if not exists wallet_transactions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  type         wallet_tx_type not null,
  amount       integer not null,        -- 양수: 충전/적립, 음수: 차감
  balance_after integer not null,
  product_code text,
  reference_id text,                    -- PG 주문번호 등 외부 참조
  description  text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_wallet_tx_user_date
  on wallet_transactions(user_id, created_at desc);

-- 3. 상품/가격표 (코드 배포 없이 가격 조정 가능하도록 DB 설정으로 분리)
create table if not exists product_prices (
  product_code   text primary key,
  display_name   text not null,
  cash_price     integer not null check (cash_price >= 0),
  ai_model       text,                  -- null = AI 미사용 기능
  ad_unlockable  boolean not null default false,  -- 광고 시청으로 무료 해제 가능 여부
  is_active      boolean not null default true,
  updated_at     timestamptz not null default now()
);

-- 4. 일일 해제 콘텐츠 (오늘의 카드 등, 하루 1회 해제 개념이 있는 상품)
create table if not exists daily_unlocks (
  user_id      uuid not null references auth.users(id) on delete cascade,
  product_code text not null references product_prices(product_code),
  unlock_date  date not null default current_date,
  method       text not null check (method in ('cash', 'ad')),
  created_at   timestamptz not null default now(),
  primary key (user_id, product_code, unlock_date)
);

-- 5. 광고 시청 로그 (하루 3회 상한 체크의 기준)
create table if not exists ad_view_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  purpose      text not null check (purpose in ('cash_reward', 'content_unlock')),
  reward_cash  integer not null default 0,
  product_code text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_ad_view_logs_user_date
  on ad_view_logs(user_id, created_at desc);

-- 6. 캐시 충전 주문 (PG 결제 — 웹훅이 완료 처리)
create type purchase_status as enum ('pending', 'completed', 'failed', 'cancelled');

create table if not exists purchase_orders (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  krw_amount       integer not null,
  cash_amount      integer not null,     -- 보너스 포함 지급 예정 캐시
  pg_provider      text not null,        -- 'tosspayments' | 'kakaopay'
  pg_transaction_id text unique,
  status           purchase_status not null default 'pending',
  created_at       timestamptz not null default now(),
  completed_at     timestamptz
);

-- ============================================================
-- RLS: 모든 잔액 관련 테이블은 조회만 허용, 쓰기는 함수를 통해서만
-- ============================================================
alter table wallets enable row level security;
alter table wallet_transactions enable row level security;
alter table product_prices enable row level security;
alter table daily_unlocks enable row level security;
alter table ad_view_logs enable row level security;
alter table purchase_orders enable row level security;

create policy "본인 지갑만 조회" on wallets
  for select using (auth.uid() = user_id);

create policy "본인 거래내역만 조회" on wallet_transactions
  for select using (auth.uid() = user_id);

create policy "가격표는 로그인 사용자 모두 조회" on product_prices
  for select using (auth.role() = 'authenticated');

create policy "본인 해제내역만 조회" on daily_unlocks
  for select using (auth.uid() = user_id);

create policy "본인 광고시청기록만 조회" on ad_view_logs
  for select using (auth.uid() = user_id);

create policy "본인 주문만 조회" on purchase_orders
  for select using (auth.uid() = user_id);

create policy "본인 주문 생성(결제 시작 시)만 가능" on purchase_orders
  for insert with check (auth.uid() = user_id);
-- purchase_orders의 status 업데이트(completed 전환)는 PG 웹훅(service_role)만 수행

-- ============================================================
-- 신규 회원가입 시 지갑 자동 생성 (+ 웰컴 캐시 500 지급 — 017 마이그레이션에서 도입)
-- ============================================================
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

drop trigger if exists on_auth_user_created_wallet on auth.users;
create trigger on_auth_user_created_wallet
  after insert on auth.users
  for each row execute function handle_new_user_wallet();

-- ============================================================
-- LPT(QuestofME) 캐시 결제/광고 리워드 시스템 — 함수
-- 모든 함수는 SECURITY DEFINER: RLS를 우회해 잔액을 안전하게 변경.
-- 클라이언트는 반드시 이 함수들(rpc)만 호출해야 하며,
-- 테이블 직접 write는 RLS로 차단되어 있음.
-- ============================================================

-- ------------------------------------------------------------
-- 1) 리워드 광고 시청 → 캐시 적립 (하루 3회 상한)
-- ------------------------------------------------------------
create or replace function grant_ad_cash_reward(p_reward_amount integer default 100)
returns table(new_balance integer, remaining_today integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today_count integer;
  v_balance integer;
begin
  if v_user_id is null then
    raise exception '인증되지 않은 요청입니다';
  end if;

  select count(*) into v_today_count
  from ad_view_logs
  where user_id = v_user_id and created_at::date = current_date;

  if v_today_count >= 3 then
    raise exception '오늘의 광고 리워드 횟수(3회)를 모두 사용했습니다';
  end if;

  insert into ad_view_logs(user_id, purpose, reward_cash)
  values (v_user_id, 'cash_reward', p_reward_amount);

  update wallets
  set cash_balance = cash_balance + p_reward_amount, updated_at = now()
  where user_id = v_user_id
  returning cash_balance into v_balance;

  insert into wallet_transactions(user_id, type, amount, balance_after, description)
  values (v_user_id, 'ad_reward', p_reward_amount, v_balance, '리워드 광고 시청 캐시 적립');

  return query select v_balance, (2 - v_today_count);
end;
$$;

revoke all on function grant_ad_cash_reward from public;
grant execute on function grant_ad_cash_reward to authenticated;

-- ------------------------------------------------------------
-- 2) 일일 콘텐츠 해제 (오늘의 카드 등) — 캐시 결제 또는 광고 시청
--    ad_unlockable = false인 상품(정밀리포트 등 AI 유료 콘텐츠)은
--    method='ad' 요청이 오더라도 서버에서 거부됨 (프론트 우회 방지)
-- ------------------------------------------------------------
create or replace function unlock_daily_content(p_product_code text, p_method text)
returns table(unlocked boolean, new_balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_price integer;
  v_ad_unlockable boolean;
  v_is_active boolean;
  v_today_ad_count integer;
  v_balance integer;
begin
  if v_user_id is null then
    raise exception '인증되지 않은 요청입니다';
  end if;

  select cash_price, ad_unlockable, is_active
  into v_price, v_ad_unlockable, v_is_active
  from product_prices
  where product_code = p_product_code;

  if not found or not v_is_active then
    raise exception '존재하지 않거나 비활성화된 상품입니다: %', p_product_code;
  end if;

  if exists (
    select 1 from daily_unlocks
    where user_id = v_user_id
      and product_code = p_product_code
      and unlock_date = current_date
  ) then
    raise exception '오늘 이미 해제된 콘텐츠입니다';
  end if;

  if p_method = 'ad' then
    if not v_ad_unlockable then
      raise exception '이 콘텐츠는 광고로 해제할 수 없습니다. 캐시로 결제해주세요.';
    end if;

    select count(*) into v_today_ad_count
    from ad_view_logs
    where user_id = v_user_id and created_at::date = current_date;

    if v_today_ad_count >= 3 then
      raise exception '오늘의 광고 리워드 횟수(3회)를 모두 사용했습니다';
    end if;

    insert into ad_view_logs(user_id, purpose, product_code)
    values (v_user_id, 'content_unlock', p_product_code);

    insert into daily_unlocks(user_id, product_code, method)
    values (v_user_id, p_product_code, 'ad');

    select cash_balance into v_balance from wallets where user_id = v_user_id;
    return query select true, v_balance;

  elsif p_method = 'cash' then
    select cash_balance into v_balance from wallets
    where user_id = v_user_id for update;

    if v_balance < v_price then
      raise exception '캐시가 부족합니다 (보유: %, 필요: %)', v_balance, v_price;
    end if;

    update wallets set cash_balance = cash_balance - v_price, updated_at = now()
    where user_id = v_user_id
    returning cash_balance into v_balance;

    insert into wallet_transactions(user_id, type, amount, balance_after, product_code, description)
    values (v_user_id, 'spend', -v_price, v_balance, p_product_code, '캐시 결제로 콘텐츠 해제');

    insert into daily_unlocks(user_id, product_code, method)
    values (v_user_id, p_product_code, 'cash');

    return query select true, v_balance;
  else
    raise exception '잘못된 해제 방식입니다: %', p_method;
  end if;
end;
$$;

revoke all on function unlock_daily_content from public;
grant execute on function unlock_daily_content to authenticated;

-- ------------------------------------------------------------
-- 3) 일반 상품 구매 (정밀 리포트 / 궁합분석 / 대운세운 — 일일 제한 없음)
--    ad_unlockable 여부와 무관하게 이 함수는 오직 캐시 결제만 처리
--    (프리미엄 AI 콘텐츠는 애초에 광고 해제 경로 자체가 없음)
-- ------------------------------------------------------------
create or replace function purchase_product(p_product_code text, p_reference_id text default null)
returns table(new_balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_price integer;
  v_is_active boolean;
  v_balance integer;
begin
  if v_user_id is null then
    raise exception '인증되지 않은 요청입니다';
  end if;

  select cash_price, is_active into v_price, v_is_active
  from product_prices where product_code = p_product_code;

  if not found or not v_is_active then
    raise exception '존재하지 않거나 비활성화된 상품입니다: %', p_product_code;
  end if;

  select cash_balance into v_balance from wallets
  where user_id = v_user_id for update;

  if v_balance < v_price then
    raise exception '캐시가 부족합니다 (보유: %, 필요: %)', v_balance, v_price;
  end if;

  update wallets set cash_balance = cash_balance - v_price, updated_at = now()
  where user_id = v_user_id
  returning cash_balance into v_balance;

  insert into wallet_transactions(user_id, type, amount, balance_after, product_code, reference_id, description)
  values (v_user_id, 'spend', -v_price, v_balance, p_product_code, p_reference_id, '캐시 결제');

  return query select v_balance;
end;
$$;

revoke all on function purchase_product from public;
grant execute on function purchase_product to authenticated;

-- ------------------------------------------------------------
-- 4) PG 결제 완료 후 캐시 충전 (service_role 전용 — 웹훅 서버만 호출 가능)
--    authenticated 유저는 이 함수를 직접 호출할 수 없음 (클라이언트發 캐시 위조 방지)
-- ------------------------------------------------------------

-- 같은 결제(paymentKey)로 두 번 캐시가 지급되는 걸 DB 레벨에서 확실히 막는다
-- (애플리케이션 레벨 체크만으로는 동시 요청 레이스 컨디션을 완전히 못 막음).
create unique index if not exists idx_wallet_tx_charge_reference
  on wallet_transactions(reference_id)
  where type = 'charge' and reference_id is not null;

create or replace function charge_cash_from_pg(
  p_user_id uuid,
  p_krw_amount integer,
  p_cash_amount integer,
  p_pg_transaction_id text
)
returns table(new_balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  insert into wallets(user_id, cash_balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  update wallets set cash_balance = cash_balance + p_cash_amount, updated_at = now()
  where user_id = p_user_id
  returning cash_balance into v_balance;

  begin
    insert into wallet_transactions(user_id, type, amount, balance_after, reference_id, description)
    values (
      p_user_id, 'charge', p_cash_amount, v_balance, p_pg_transaction_id,
      format('%s원 결제 → %s캐시 충전', p_krw_amount, p_cash_amount)
    );
  exception when unique_violation then
    update wallets set cash_balance = cash_balance - p_cash_amount, updated_at = now()
    where user_id = p_user_id;

    select balance_after into v_balance
    from wallet_transactions
    where reference_id = p_pg_transaction_id and type = 'charge'
    limit 1;
  end;

  return query select v_balance;
end;
$$;

revoke all on function charge_cash_from_pg from public;
revoke all on function charge_cash_from_pg from authenticated;
grant execute on function charge_cash_from_pg to service_role;

-- ============================================================
-- 상품 가격 시드
-- ad_unlockable=false 인 상품(AI 호출 원가가 있는 유료 콘텐츠)은
-- unlock_daily_content()/프론트 어디서도 광고로 우회 해제 불가
-- ============================================================

insert into product_prices (product_code, display_name, cash_price, ai_model, ad_unlockable, is_active)
values
  ('daily_card_unlock', '오늘의 카드 즉시해제', 500, null, true, true),
  ('premium_report',    '정밀 사주 리포트',     1900, 'haiku-4.5', false, true),
  ('compatibility_deep','심층 궁합 분석',       2500, 'haiku-4.5', false, true),
  ('daeun_seun',        '대운·세운 해석',       1500, 'haiku-4.5', false, true)
on conflict (product_code) do update set
  display_name  = excluded.display_name,
  cash_price    = excluded.cash_price,
  ai_model      = excluded.ai_model,
  ad_unlockable = excluded.ad_unlockable,
  is_active     = excluded.is_active,
  updated_at    = now();

-- 캐시 충전 단위(보너스율)는 코드 테이블이 아니라 프론트 상수로 관리해도 무방하나,
-- 추후 프로모션 실험을 위해 DB화하려면 아래처럼 별도 테이블을 추가할 수 있음:
--
-- create table cash_charge_options (
--   krw_amount   integer primary key,
--   cash_amount  integer not null,
--   bonus_label  text
-- );
-- insert into cash_charge_options values
--   (1000, 1000, null),
--   (3000, 3300, '+10%'),
--   (5000, 5750, '+15%'),
--   (10000, 12000, '+20%');
-- Phase 3 — AI 생성 유료 콘텐츠 저장
--
-- purchase_product()는 캐시 차감과 거래 로그만 남기고 "무엇을 샀는지"를
-- 별도로 추적하지 않는다. 이 테이블이 그 역할(구매 여부 확인 + 생성된
-- 콘텐츠 캐싱)을 겸한다. AI 생성은 결제와 분리된 별도 단계라, 결제는
-- 성공했는데 생성이 실패하는 경우 이 테이블에 행이 없는 것으로 판별해
-- 재결제 없이 재시도할 수 있게 한다.

create table if not exists premium_content (
  user_id      uuid not null references auth.users(id) on delete cascade,
  product_code text not null references product_prices(product_code),
  content      jsonb not null,
  created_at   timestamptz not null default now(),
  primary key (user_id, product_code)
);

alter table premium_content enable row level security;

create policy "본인 유료 콘텐츠만 조회" on premium_content
  for select using (auth.uid() = user_id);

-- insert/update는 Edge Function이 service_role로만 수행 (별도 정책 없음 = 클라이언트 직접 쓰기 불가)

-- Phase 3 — 관리자 전용 기능
--
-- 운영 중 CS 대응(결제됐는데 캐시가 안 들어갔다는 문의 등)을 위해, 관리자가
-- 특정 사용자의 캐시를 수동으로 조정할 수 있는 함수. service_role
-- (/api/admin/* 라우트, lib/adminAuth.ts로 이메일 검증된 요청)에서만
-- 호출한다 — 일반 로그인 사용자는 절대 호출할 수 없다.

create or replace function admin_adjust_cash(
  p_user_id uuid,
  p_amount integer,       -- 양수면 지급, 음수면 차감
  p_reason text
)
returns table(new_balance integer)
language plpgsql
security definer
as $$
declare
  v_new_balance integer;
begin
  update wallets
    set cash_balance = cash_balance + p_amount,
        updated_at = now()
    where user_id = p_user_id
    returning cash_balance into v_new_balance;

  if v_new_balance is null then
    raise exception '지갑을 찾을 수 없습니다 (user_id: %)', p_user_id;
  end if;

  insert into wallet_transactions (user_id, type, amount, balance_after, description)
  values (
    p_user_id,
    (case when p_amount >= 0 then 'refund' else 'spend' end)::wallet_tx_type,
    p_amount,
    v_new_balance,
    coalesce(p_reason, '관리자 수동 조정')
  );

  return query select v_new_balance;
end;
$$;

-- 일반 사용자는 이 함수를 직접 호출할 수 없다 (service_role만 실행 가능하도록 명시적으로 차단)
revoke execute on function admin_adjust_cash(uuid, integer, text) from public, authenticated, anon;

-- Phase 3 — 닉네임 검수(AI) 결과 캐싱, Anthropic API 호출 비용 절감
--
-- 똑같은 문자열이 여러 사람에게서 반복 입력되는 경우(흔한 시도값, 장난
-- 입력 등)가 실제로 많다. 정규화한 텍스트의 해시를 키로, 한 번 판정한
-- 결과를 캐싱해 같은 입력에 대해 매번 AI를 새로 호출하지 않게 한다.
-- 원문은 저장하지 않는다(해시만) — 문제로 판정된 원문은 이미
-- moderation_reports에 따로 남는다.

create table if not exists moderation_cache (
  text_hash  text primary key,   -- sha256(정규화된 텍스트)
  category   text not null,      -- 'none' 포함, classifyText()의 판정 결과
  created_at timestamptz not null default now()
);

alter table moderation_cache enable row level security;
-- 클라이언트는 이 테이블에 접근할 필요가 없다 (Edge Function이 service_role로만
-- 읽고 쓴다) — 별도 정책을 만들지 않아 RLS 기본값(전체 차단)을 그대로 둔다.

-- Phase 3 — "내 계정" 화면 기능 지원 (공유 링크 소유자 추적 + 삭제 권한)
--
-- 지금까지 shared_profiles는 "누가 만들었는지" 기록하지 않았다(비로그인도
-- 만들 수 있는 기능이라 원래 그렇게 설계함). "내 계정 > 공유 링크 관리"
-- 화면에서 본인이 만든 링크만 골라 보여주고 지울 수 있으려면, 로그인한
-- 상태로 만든 링크에 한해 소유자를 남겨야 한다. 비로그인으로 만든 링크는
-- user_id가 null로 남고, 계정 화면에는 당연히 나타나지 않는다(원래도
-- 추적 불가능한 게 맞다 — 비로그인 공유의 특성).

alter table shared_profiles
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- 본인이 만든 공유 링크는 직접 삭제(공개 비활성화)할 수 있게 한다.
create policy "본인 공유 프로필만 삭제" on shared_profiles
  for delete using (auth.uid() = user_id);


-- ============================================================
-- moderation_reports: 콘텐츠 감수(Audit) 신고 테이블 (Phase 3)
--    코드 리뷰 중 발견 — 원래 migrations/003에만 있고 이 통합 스키마
--    파일에는 누락되어 있었다 (새 프로젝트를 이 파일 하나로 세팅할 때
--    빠지는 문제가 있어 추가한다).
-- ============================================================
create table if not exists moderation_reports (
  id bigint generated always as identity primary key,
  field_name text not null,
  content_snippet text not null,
  category text not null,
  severity text not null default 'flagged',
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table moderation_reports enable row level security;

create policy "감수 신고 insert만 허용" on moderation_reports
  for insert with check (true);

-- ============================================================
-- coupang_product_cache: 쿠팡파트너스 상품검색 캐시 (Phase 3)
--    코드 리뷰 중 발견 — migrations/005에만 있고 누락되어 있었다.
-- ============================================================
create table if not exists coupang_product_cache (
  keyword text primary key,
  products jsonb not null,
  fetched_at timestamptz not null default now()
);

alter table coupang_product_cache enable row level security;

create policy "쿠팡 캐시 공개 조회" on coupang_product_cache
  for select using (true);
-- Phase 3 — "이번 달 운세" 상품 (반복 수익 모델 보완)
--
-- 배경: 정밀 사주 리포트·대운세운 해석은 한 번 사면 평생 캐싱되어 재구매
-- 유인이 구조적으로 없다(사주 자체가 평생 안 바뀌므로). 반면 월운(月運)은
-- 매달 실제로 바뀌는 값이라, "이번 달 운세"를 상품화하면 자연스럽게
-- 매달 재구매할 이유가 생긴다. 가격을 낮게 잡아 매달 부담 없이 사게 한다.

insert into product_prices (product_code, display_name, cash_price, ai_model, ad_unlockable, is_active)
values
  ('monthly_fortune', '이번 달 운세', 700, 'haiku-4.5', false, true)
on conflict (product_code) do update set
  display_name  = excluded.display_name,
  cash_price    = excluded.cash_price,
  ai_model      = excluded.ai_model,
  ad_unlockable = excluded.ad_unlockable,
  is_active     = excluded.is_active,
  updated_at    = now();

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
-- friend_invites: 같은 상대와 중복 친구관계는 1명으로만 카운트하고,
-- 상대방이 실제로 사주 분석을 완료했으며 생성된 지 최소 하루 지난
-- 계정일 때만 인정한다(가짜 계정 대량 생성 어뷰징 방지).
-- ============================================================
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
  return query
    select 'friend_invites'::text, get_user_metric_value(v_user_id, 'friend_invites')
    union all
    select 'level_reached'::text, get_user_metric_value(v_user_id, 'level_reached')
    union all
    select 'badges_collected'::text, get_user_metric_value(v_user_id, 'badges_collected');
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

-- ============================================================
-- 레벨/뱃지 성장 보너스 시드 — 친구초대 외에도 앱 안에서의 성장 자체로
-- 재미있게 보상받을 수 있게 한다.
-- ============================================================
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
-- Phase 3 — 두 종류 캐시 분리 (보너스 캐시 / 실제 캐시)
--
-- 배경: 웰컴캐시+마일스톤 보상을 전부 합치면 한 사용자가 최대 약
-- 20,300캐시를 무료로 받을 수 있는데, 지금까지는 이게 AI 호출 원가가
-- 있는 상품(정밀리포트 등)에도 무제한으로 쓰일 수 있었다. AI 원가는
-- 실제로 나가는데 매출은 0원인 상황이 반복될 수 있어, 게임업계에서
-- 흔히 쓰는 "소프트 캐시/하드 캐시" 패턴으로 분리한다.
--
-- 원칙:
-- - 무료 지급(웰컴캐시·마일스톤 보상·광고 리워드)은 전부 bonus_balance로
-- - 실제 결제(토스페이먼츠)는 cash_balance로 (기존과 동일)
-- - 원가가 없는 상품(ad_unlockable=true, 오늘의 카드)은 bonus_balance를
--   먼저 쓰고 모자라면 cash_balance로 나머지를 채운다
-- - 원가가 있는 상품(ad_unlockable=false, AI 콘텐츠)은 cash_balance만
--   쓸 수 있다 — bonus_balance는 절대 여기 쓰이지 않는다
-- - 관리자 수동 조정(CS 대응)은 실제 결제 문제를 보상하는 것이므로
--   cash_balance를 조정한다(기존과 동일, 변경 없음)

alter table wallets
  add column if not exists bonus_balance integer not null default 0 check (bonus_balance >= 0);

alter table wallet_transactions
  add column if not exists bonus_balance_after integer;

comment on column wallets.bonus_balance is
  '무료로 적립된 캐시(웰컴캐시·마일스톤·광고리워드). AI 원가가 있는 상품에는 쓸 수 없다.';
comment on column wallets.cash_balance is
  '실제 결제로 충전한 캐시(+ 관리자 수동 조정). 모든 상품 결제에 쓸 수 있다.';

-- ============================================================
-- 1) 광고 리워드 → bonus_balance로 적립
-- ============================================================
create or replace function grant_ad_cash_reward(p_reward_amount integer default 100)
returns table(new_balance integer, remaining_today integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today_count integer;
  v_bonus_balance integer;
  v_cash_balance integer;
begin
  if v_user_id is null then
    raise exception '인증되지 않은 요청입니다';
  end if;

  select count(*) into v_today_count
  from ad_view_logs
  where user_id = v_user_id and created_at::date = current_date;

  if v_today_count >= 3 then
    raise exception '오늘의 광고 리워드 횟수(3회)를 모두 사용했습니다';
  end if;

  insert into ad_view_logs(user_id, purpose, reward_cash)
  values (v_user_id, 'cash_reward', p_reward_amount);

  update wallets
  set bonus_balance = bonus_balance + p_reward_amount, updated_at = now()
  where user_id = v_user_id
  returning bonus_balance, cash_balance into v_bonus_balance, v_cash_balance;

  insert into wallet_transactions(user_id, type, amount, balance_after, bonus_balance_after, description)
  values (v_user_id, 'ad_reward', p_reward_amount, v_cash_balance, v_bonus_balance, '리워드 광고 시청 보너스캐시 적립');

  return query select v_bonus_balance + v_cash_balance, (2 - v_today_count);
end;
$$;

-- ============================================================
-- 2) 일일 콘텐츠 해제 — bonus_balance 먼저 쓰고 모자라면 cash_balance
--    (오늘의 카드는 원가가 거의 없는 ad_unlockable=true 상품이라
--    보너스캐시로 쓰는 게 원래 의도에 맞다)
-- ============================================================
create or replace function unlock_daily_content(p_product_code text, p_method text)
returns table(unlocked boolean, new_balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_price integer;
  v_ad_unlockable boolean;
  v_is_active boolean;
  v_today_ad_count integer;
  v_bonus_balance integer;
  v_cash_balance integer;
  v_from_bonus integer;
  v_from_cash integer;
begin
  if v_user_id is null then
    raise exception '인증되지 않은 요청입니다';
  end if;

  select cash_price, ad_unlockable, is_active
  into v_price, v_ad_unlockable, v_is_active
  from product_prices
  where product_code = p_product_code;

  if not found or not v_is_active then
    raise exception '존재하지 않거나 비활성화된 상품입니다: %', p_product_code;
  end if;

  if exists (
    select 1 from daily_unlocks
    where user_id = v_user_id
      and product_code = p_product_code
      and unlock_date = current_date
  ) then
    raise exception '오늘 이미 해제된 콘텐츠입니다';
  end if;

  if p_method = 'ad' then
    if not v_ad_unlockable then
      raise exception '이 콘텐츠는 광고로 해제할 수 없습니다. 캐시로 결제해주세요.';
    end if;

    select count(*) into v_today_ad_count
    from ad_view_logs
    where user_id = v_user_id and created_at::date = current_date;

    if v_today_ad_count >= 3 then
      raise exception '오늘의 광고 리워드 횟수(3회)를 모두 사용했습니다';
    end if;

    insert into ad_view_logs(user_id, purpose, product_code)
    values (v_user_id, 'content_unlock', p_product_code);

    insert into daily_unlocks(user_id, product_code, method)
    values (v_user_id, p_product_code, 'ad');

    select bonus_balance + cash_balance into v_bonus_balance from wallets where user_id = v_user_id;
    return query select true, v_bonus_balance;

  elsif p_method = 'cash' then
    select bonus_balance, cash_balance into v_bonus_balance, v_cash_balance from wallets
    where user_id = v_user_id for update;

    if (v_bonus_balance + v_cash_balance) < v_price then
      raise exception '캐시가 부족합니다 (보유: %, 필요: %)', v_bonus_balance + v_cash_balance, v_price;
    end if;

    if not v_ad_unlockable then
      -- 원가가 있는 상품(이론상 이 함수 경로로는 안 들어오지만 방어적으로 막아둠):
      -- 보너스캐시는 절대 쓰지 않는다
      if v_cash_balance < v_price then
        raise exception '이 상품은 실제 캐시로만 결제할 수 있어요 (보유 실제캐시: %, 필요: %)', v_cash_balance, v_price;
      end if;
      v_from_bonus := 0;
      v_from_cash := v_price;
    else
      v_from_bonus := least(v_bonus_balance, v_price);
      v_from_cash := v_price - v_from_bonus;
    end if;

    update wallets
    set bonus_balance = bonus_balance - v_from_bonus,
        cash_balance = cash_balance - v_from_cash,
        updated_at = now()
    where user_id = v_user_id
    returning bonus_balance, cash_balance into v_bonus_balance, v_cash_balance;

    insert into wallet_transactions(user_id, type, amount, balance_after, bonus_balance_after, product_code, description)
    values (v_user_id, 'spend', -v_price, v_cash_balance, v_bonus_balance, p_product_code, '캐시 결제로 콘텐츠 해제');

    insert into daily_unlocks(user_id, product_code, method)
    values (v_user_id, p_product_code, 'cash');

    return query select true, v_bonus_balance + v_cash_balance;
  else
    raise exception '잘못된 해제 방식입니다: %', p_method;
  end if;
end;
$$;

-- ============================================================
-- 3) 일반 상품 구매(정밀리포트/궁합분석/대운세운/이번달운세) —
--    원가가 있는 상품이라 실제 캐시(cash_balance)만 쓸 수 있다.
--    보너스캐시로는 절대 결제할 수 없다.
-- ============================================================
create or replace function purchase_product(p_product_code text, p_reference_id text default null)
returns table(new_balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_price integer;
  v_is_active boolean;
  v_ad_unlockable boolean;
  v_bonus_balance integer;
  v_cash_balance integer;
  v_from_bonus integer;
  v_from_cash integer;
begin
  if v_user_id is null then
    raise exception '인증되지 않은 요청입니다';
  end if;

  select cash_price, is_active, ad_unlockable into v_price, v_is_active, v_ad_unlockable
  from product_prices where product_code = p_product_code;

  if not found or not v_is_active then
    raise exception '존재하지 않거나 비활성화된 상품입니다: %', p_product_code;
  end if;

  select bonus_balance, cash_balance into v_bonus_balance, v_cash_balance from wallets
  where user_id = v_user_id for update;

  if v_ad_unlockable then
    -- 원가가 거의 없는 상품: 보너스캐시 먼저, 모자라면 실제캐시
    if (v_bonus_balance + v_cash_balance) < v_price then
      raise exception '캐시가 부족합니다 (보유: %, 필요: %)', v_bonus_balance + v_cash_balance, v_price;
    end if;
    v_from_bonus := least(v_bonus_balance, v_price);
    v_from_cash := v_price - v_from_bonus;
  else
    -- 원가가 있는 상품: 실제캐시만 쓸 수 있다
    if v_cash_balance < v_price then
      raise exception '이 상품은 실제 캐시로만 결제할 수 있어요 (보유 실제캐시: %, 필요: %)', v_cash_balance, v_price;
    end if;
    v_from_bonus := 0;
    v_from_cash := v_price;
  end if;

  update wallets
  set bonus_balance = bonus_balance - v_from_bonus,
      cash_balance = cash_balance - v_from_cash,
      updated_at = now()
  where user_id = v_user_id
  returning bonus_balance, cash_balance into v_bonus_balance, v_cash_balance;

  insert into wallet_transactions(user_id, type, amount, balance_after, bonus_balance_after, product_code, reference_id, description)
  values (v_user_id, 'spend', -v_price, v_cash_balance, v_bonus_balance, p_product_code, p_reference_id, '캐시 결제');

  return query select v_bonus_balance + v_cash_balance;
end;
$$;

-- ============================================================
-- 4) 웰컴 캐시 → bonus_balance로 지급
-- ============================================================
create or replace function handle_new_user_wallet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into wallets(user_id, cash_balance, bonus_balance) values (new.id, 0, 500)
  on conflict (user_id) do nothing;

  insert into wallet_transactions(user_id, type, amount, balance_after, bonus_balance_after, description)
  values (new.id, 'refund', 500, 0, 500, '신규 가입 웰컴 보너스캐시');

  return new;
end;
$$;

-- ============================================================
-- 5) 마일스톤 보상 → bonus_balance로 지급
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
  v_bonus_balance integer;
  v_cash_balance integer;
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

  insert into wallets(user_id, cash_balance, bonus_balance) values (v_user_id, 0, 0)
    on conflict (user_id) do nothing;

  update wallets set bonus_balance = bonus_balance + v_milestone.reward_cash, updated_at = now()
    where user_id = v_user_id
    returning bonus_balance, cash_balance into v_bonus_balance, v_cash_balance;

  insert into wallet_transactions(user_id, type, amount, balance_after, bonus_balance_after, description)
    values (v_user_id, 'refund', v_milestone.reward_cash, v_cash_balance, v_bonus_balance, v_milestone.title || ' 달성 보너스캐시');

  return query select v_bonus_balance + v_cash_balance, v_milestone.reward_cash;
end;
$$;

-- Phase 3 — "캐시" 용어를 "보석"/"별조각"으로 전면 교체
--
-- 배경: "캐시"라는 표현이 법적으로 민감할 수 있고(선불전자지급수단 등
-- 관련 규제 용어와 혼동 소지), 실제캐시/보너스캐시라는 이름도 사용자
-- 입장에서 헷갈린다는 지적이 있었다. 화면 UI는 이미 전부 정리했는데,
-- DB 함수가 거래내역에 남기는 설명 문구와 에러 메시지에는 "캐시"가
-- 그대로 남아있어 실제 화면(최근 거래 내역)에 노출되고 있었다 — 이걸
-- 마저 정리한다.
--
-- 이름: 보석(구매로 충전, 모든 상품 결제 가능) / 별조각(무료 지급,
-- AI 원가 있는 상품에는 쓸 수 없음)

create or replace function charge_cash_from_pg(
  p_user_id uuid,
  p_krw_amount integer,
  p_cash_amount integer,
  p_pg_transaction_id text
)
returns table(new_balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  insert into wallets(user_id, cash_balance) values (p_user_id, 0)
    on conflict (user_id) do nothing;

  update wallets set cash_balance = cash_balance + p_cash_amount, updated_at = now()
  where user_id = p_user_id
  returning cash_balance into v_balance;

  begin
    insert into wallet_transactions(user_id, type, amount, balance_after, reference_id, description)
    values (
      p_user_id, 'charge', p_cash_amount, v_balance, p_pg_transaction_id,
      format('%s원 결제 → 보석 %s개 충전', p_krw_amount, p_cash_amount)
    );
  exception when unique_violation then
    update wallets set cash_balance = cash_balance - p_cash_amount, updated_at = now()
    where user_id = p_user_id;

    select balance_after into v_balance
    from wallet_transactions
    where reference_id = p_pg_transaction_id and type = 'charge'
    limit 1;
  end;

  return query select v_balance;
end;
$$;

create or replace function grant_ad_cash_reward(p_reward_amount integer default 100)
returns table(new_balance integer, remaining_today integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_today_count integer;
  v_bonus_balance integer;
  v_cash_balance integer;
begin
  if v_user_id is null then
    raise exception '인증되지 않은 요청입니다';
  end if;

  select count(*) into v_today_count
  from ad_view_logs
  where user_id = v_user_id and created_at::date = current_date;

  if v_today_count >= 3 then
    raise exception '오늘의 광고 리워드 횟수(3회)를 모두 사용했습니다';
  end if;

  insert into ad_view_logs(user_id, purpose, reward_cash)
  values (v_user_id, 'cash_reward', p_reward_amount);

  update wallets
  set bonus_balance = bonus_balance + p_reward_amount, updated_at = now()
  where user_id = v_user_id
  returning bonus_balance, cash_balance into v_bonus_balance, v_cash_balance;

  insert into wallet_transactions(user_id, type, amount, balance_after, bonus_balance_after, description)
  values (v_user_id, 'ad_reward', p_reward_amount, v_cash_balance, v_bonus_balance, '리워드 광고 시청 별조각 적립');

  return query select v_bonus_balance + v_cash_balance, (2 - v_today_count);
end;
$$;

create or replace function unlock_daily_content(p_product_code text, p_method text)
returns table(unlocked boolean, new_balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_price integer;
  v_ad_unlockable boolean;
  v_is_active boolean;
  v_today_ad_count integer;
  v_bonus_balance integer;
  v_cash_balance integer;
  v_from_bonus integer;
  v_from_cash integer;
begin
  if v_user_id is null then
    raise exception '인증되지 않은 요청입니다';
  end if;

  select cash_price, ad_unlockable, is_active
  into v_price, v_ad_unlockable, v_is_active
  from product_prices
  where product_code = p_product_code;

  if not found or not v_is_active then
    raise exception '존재하지 않거나 비활성화된 상품입니다: %', p_product_code;
  end if;

  if exists (
    select 1 from daily_unlocks
    where user_id = v_user_id
      and product_code = p_product_code
      and unlock_date = current_date
  ) then
    raise exception '오늘 이미 해제된 콘텐츠입니다';
  end if;

  if p_method = 'ad' then
    if not v_ad_unlockable then
      raise exception '이 콘텐츠는 광고로 해제할 수 없습니다. 보석으로 결제해주세요.';
    end if;

    select count(*) into v_today_ad_count
    from ad_view_logs
    where user_id = v_user_id and created_at::date = current_date;

    if v_today_ad_count >= 3 then
      raise exception '오늘의 광고 리워드 횟수(3회)를 모두 사용했습니다';
    end if;

    insert into ad_view_logs(user_id, purpose, product_code)
    values (v_user_id, 'content_unlock', p_product_code);

    insert into daily_unlocks(user_id, product_code, method)
    values (v_user_id, p_product_code, 'ad');

    select bonus_balance + cash_balance into v_bonus_balance from wallets where user_id = v_user_id;
    return query select true, v_bonus_balance;

  elsif p_method = 'cash' then
    select bonus_balance, cash_balance into v_bonus_balance, v_cash_balance from wallets
    where user_id = v_user_id for update;

    if (v_bonus_balance + v_cash_balance) < v_price then
      raise exception '자산이 부족합니다 (보유: %, 필요: %)', v_bonus_balance + v_cash_balance, v_price;
    end if;

    if not v_ad_unlockable then
      if v_cash_balance < v_price then
        raise exception '이 상품은 보석으로만 결제할 수 있어요 (보유 보석: %, 필요: %)', v_cash_balance, v_price;
      end if;
      v_from_bonus := 0;
      v_from_cash := v_price;
    else
      v_from_bonus := least(v_bonus_balance, v_price);
      v_from_cash := v_price - v_from_bonus;
    end if;

    update wallets
    set bonus_balance = bonus_balance - v_from_bonus,
        cash_balance = cash_balance - v_from_cash,
        updated_at = now()
    where user_id = v_user_id
    returning bonus_balance, cash_balance into v_bonus_balance, v_cash_balance;

    insert into wallet_transactions(user_id, type, amount, balance_after, bonus_balance_after, product_code, description)
    values (v_user_id, 'spend', -v_price, v_cash_balance, v_bonus_balance, p_product_code, '결제로 콘텐츠 해제');

    insert into daily_unlocks(user_id, product_code, method)
    values (v_user_id, p_product_code, 'cash');

    return query select true, v_bonus_balance + v_cash_balance;
  else
    raise exception '잘못된 해제 방식입니다: %', p_method;
  end if;
end;
$$;

create or replace function purchase_product(p_product_code text, p_reference_id text default null)
returns table(new_balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_price integer;
  v_is_active boolean;
  v_ad_unlockable boolean;
  v_bonus_balance integer;
  v_cash_balance integer;
  v_from_bonus integer;
  v_from_cash integer;
begin
  if v_user_id is null then
    raise exception '인증되지 않은 요청입니다';
  end if;

  select cash_price, is_active, ad_unlockable into v_price, v_is_active, v_ad_unlockable
  from product_prices where product_code = p_product_code;

  if not found or not v_is_active then
    raise exception '존재하지 않거나 비활성화된 상품입니다: %', p_product_code;
  end if;

  select bonus_balance, cash_balance into v_bonus_balance, v_cash_balance from wallets
  where user_id = v_user_id for update;

  if v_ad_unlockable then
    if (v_bonus_balance + v_cash_balance) < v_price then
      raise exception '자산이 부족합니다 (보유: %, 필요: %)', v_bonus_balance + v_cash_balance, v_price;
    end if;
    v_from_bonus := least(v_bonus_balance, v_price);
    v_from_cash := v_price - v_from_bonus;
  else
    if v_cash_balance < v_price then
      raise exception '이 상품은 보석으로만 결제할 수 있어요 (보유 보석: %, 필요: %)', v_cash_balance, v_price;
    end if;
    v_from_bonus := 0;
    v_from_cash := v_price;
  end if;

  update wallets
  set bonus_balance = bonus_balance - v_from_bonus,
      cash_balance = cash_balance - v_from_cash,
      updated_at = now()
  where user_id = v_user_id
  returning bonus_balance, cash_balance into v_bonus_balance, v_cash_balance;

  insert into wallet_transactions(user_id, type, amount, balance_after, bonus_balance_after, product_code, reference_id, description)
  values (v_user_id, 'spend', -v_price, v_cash_balance, v_bonus_balance, p_product_code, p_reference_id, '보석 결제');

  return query select v_bonus_balance + v_cash_balance;
end;
$$;

create or replace function handle_new_user_wallet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into wallets(user_id, cash_balance, bonus_balance) values (new.id, 0, 500)
  on conflict (user_id) do nothing;

  insert into wallet_transactions(user_id, type, amount, balance_after, bonus_balance_after, description)
  values (new.id, 'refund', 500, 0, 500, '신규 가입 웰컴 별조각');

  return new;
end;
$$;

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
  v_bonus_balance integer;
  v_cash_balance integer;
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

  insert into wallets(user_id, cash_balance, bonus_balance) values (v_user_id, 0, 0)
    on conflict (user_id) do nothing;

  update wallets set bonus_balance = bonus_balance + v_milestone.reward_cash, updated_at = now()
    where user_id = v_user_id
    returning bonus_balance, cash_balance into v_bonus_balance, v_cash_balance;

  insert into wallet_transactions(user_id, type, amount, balance_after, bonus_balance_after, description)
    values (v_user_id, 'refund', v_milestone.reward_cash, v_cash_balance, v_bonus_balance, v_milestone.title || ' 달성 별조각');

  return query select v_bonus_balance + v_cash_balance, v_milestone.reward_cash;
end;
$$;

-- 이미 쌓인 거래내역(테스트 데이터 포함)의 설명 문구도 일괄 정리한다.
update wallet_transactions set description = replace(description, '캐시 결제로 콘텐츠 해제', '보석 결제로 콘텐츠 해제')
  where description like '%캐시 결제로 콘텐츠 해제%';
update wallet_transactions set description = '보석 결제'
  where description = '캐시 결제';
update wallet_transactions set description = replace(description, '보너스캐시', '별조각')
  where description like '%보너스캐시%';
update wallet_transactions set description = regexp_replace(description, '(\d+)원 결제 → (\d+)캐시 충전', '\1원 결제 → 보석 \2개 충전')
  where description ~ '캐시 충전';

