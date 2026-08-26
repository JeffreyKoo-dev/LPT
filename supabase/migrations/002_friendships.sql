-- Phase 2c — 친구 관계(초대 링크 방식) 스키마
-- Supabase SQL Editor에서 이 파일 내용을 실행하세요.
--
-- 설계: 검색으로 다른 사용자를 찾는 기능은 없다. 본인이 초대 링크를 만들어
-- 공유하고, 상대방이 로그인한 상태로 그 링크를 열어 수락해야만 친구가 된다.

create extension if not exists pgcrypto;

create table if not exists friendships (
  id bigint generated always as identity primary key,
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid references auth.users(id) on delete cascade, -- 수락 전엔 null
  invite_code text not null unique default encode(gen_random_bytes(6), 'hex'),
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

alter table friendships enable row level security;

-- 본인이 요청자이거나 수락자인 행만 조회 가능
create policy "본인 관련 친구관계만 조회" on friendships
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- 본인을 요청자로 하는 새 초대만 생성 가능
create policy "본인 초대만 생성" on friendships
  for insert with check (auth.uid() = requester_id);

-- 초대 수락: 아직 대기 중이고, 본인이 만든 초대가 아닌 경우에만 수락 가능
create policy "초대 수락" on friendships
  for update
  using (status = 'pending' and addressee_id is null and auth.uid() <> requester_id)
  with check (auth.uid() = addressee_id and status = 'accepted');

-- 친구 사이에는 서로의 프로필(닉네임·유형·성장기록)을 조회할 수 있도록
-- user_profiles에 정책을 추가한다 (기존 "본인 프로필만 조회" 정책에 더해짐 — 여러
-- select 정책은 OR로 합쳐진다).
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
