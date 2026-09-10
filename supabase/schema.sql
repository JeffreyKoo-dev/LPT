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
-- 신규 회원가입 시 지갑 자동 생성
-- ============================================================
create or replace function handle_new_user_wallet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into wallets(user_id, cash_balance) values (new.id, 0)
  on conflict (user_id) do nothing;
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

  insert into wallet_transactions(user_id, type, amount, balance_after, reference_id, description)
  values (
    p_user_id, 'charge', p_cash_amount, v_balance, p_pg_transaction_id,
    format('%s원 결제 → %s캐시 충전', p_krw_amount, p_cash_amount)
  );

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

