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
