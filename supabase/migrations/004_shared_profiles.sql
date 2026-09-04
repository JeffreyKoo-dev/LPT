-- Phase 3 — 공유 링크로 "결과 보기 허용" 기능
-- 사용자가 명시적으로 동의한 경우에만, 공유 카드 요약 정보를 공개 조회
-- 가능한 테이블에 저장한다. 생년월일·출생시간·성별 원본은 절대 저장하지
-- 않는다 (illustration_slug는 이미 계산된 그림 파일명일 뿐, 성별 값 자체가
-- 아니다 — docs/PHASE2_ROADMAP.md 3절 개인정보 원칙과 동일하게 유지).

create table if not exists shared_profiles (
  id text primary key,              -- URL에 노출되는 공유 ID (짧은 랜덤 문자열)
  kind text not null,               -- 'character' | 'level' | 'badge'
  nickname text not null,
  heading text not null,
  subheading text not null,
  badge_label text not null,
  illustration_slug text,           -- character 카드만 존재
  icon_element text,                -- 오행 아이콘 표시용 (character 카드)
  created_at timestamptz not null default now()
);

alter table shared_profiles enable row level security;

-- 이 테이블은 "본인이 공개하기로 동의한" 데이터만 들어오므로, 누구나 조회 가능하게 한다
create policy "공유 프로필 공개 조회 허용" on shared_profiles
  for select using (true);

-- 로그인 여부와 무관하게 누구나(익명 포함) 생성 가능 — 공유는 로그인 없이도 되는 기능
create policy "공유 프로필 생성 허용" on shared_profiles
  for insert with check (true);
