-- 이미 schema.sql을 한 번 실행하셨다면, quest_log 컬럼이 없는 상태입니다.
-- Supabase SQL Editor에서 이 파일 내용을 실행해 컬럼을 추가하세요.
-- (schema.sql을 처음 실행하시는 분은 이미 quest_log가 포함되어 있으니 이 파일은 필요 없습니다.)

alter table user_profiles
  add column if not exists quest_log jsonb not null default '[]'::jsonb;
