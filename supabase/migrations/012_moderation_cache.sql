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
