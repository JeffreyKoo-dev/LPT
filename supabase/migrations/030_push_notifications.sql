-- 웹 푸시 알림(재구매 리마인더) 인프라
--
-- 배경: 카카오 알림톡을 검토했으나 전화번호 수집(+ 별도 마케팅 수신동의)이
-- 선행돼야 해서 당장은 범위가 크다고 판단, 대신 전화번호·외부 계정 없이
-- 브라우저 권한만으로 바로 구현 가능한 Web Push(VAPID)로 대체한다.
-- "이번 달 운세" 재구매 리마인더(대시보드 인앱 카드, MonthlyFortuneReminder)를
-- 푸시로도 보내는 것이 1차 목표 — 그 외 리마인더 종류를 늘릴 수 있도록
-- reminder_type을 범용 텍스트로 둔다.

create table if not exists push_subscriptions (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth_key    text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user on push_subscriptions(user_id);

alter table push_subscriptions enable row level security;

-- 본인 구독만 조회/등록/해지 가능. 발송(크론)은 service_role로 RLS 우회.
create policy "본인 푸시 구독 조회" on push_subscriptions
  for select using (auth.uid() = user_id);

create policy "본인 푸시 구독 등록" on push_subscriptions
  for insert with check (auth.uid() = user_id);

-- upsert(on conflict endpoint do update)가 기존 행을 갱신할 때 필요
create policy "본인 푸시 구독 갱신" on push_subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "본인 푸시 구독 해지" on push_subscriptions
  for delete using (auth.uid() = user_id);

-- 같은 유저에게 같은 리마인더를 한 발송 주기 안에 중복 발송하지 않기 위한 로그.
-- (여러 기기를 구독해도 한 번만 세는 게 목적이라 user_id+reminder_type 단위로 기록)
create table if not exists push_reminder_log (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  reminder_type  text not null,
  sent_at        timestamptz not null default now()
);

create index if not exists idx_push_reminder_log_lookup
  on push_reminder_log(user_id, reminder_type, sent_at);

alter table push_reminder_log enable row level security;
-- 클라이언트는 이 테이블에 접근할 필요가 없다 — 크론(service_role)만 사용.
-- 별도 정책을 만들지 않아 RLS 기본값(전체 차단)을 그대로 둔다.
