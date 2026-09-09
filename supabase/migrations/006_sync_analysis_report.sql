-- Phase 3 — 계산된 분석 리포트(사주 결과) 동기화
--
-- 원본 생년월일시는 여전히 서버에 저장하지 않는다(user_profiles에 관련
-- 컬럼 자체가 없음, 의도적 설계 유지). 대신 이미 존재하는 로그인 계정
-- (auth.uid())을 "다른 기기에서도 이어보기"의 식별자로 그대로 쓰고,
-- 생년월일시로부터 이미 계산이 끝난 파생값(천간지지·오행분포·십성 등,
-- SajuChart)만 동기화 대상에 추가한다. 이 값만으로는 원본 생년월일시를
-- 역산할 수 없다(사주 계산은 비가역적 다대일 매핑).
alter table user_profiles
  add column if not exists analysis_report jsonb;

comment on column user_profiles.analysis_report is
  '계산된 사주 분석 리포트(AnalysisReport) 전체. 원본 생년월일시는 포함하지 않는다 — sajuChart는 이미 계산이 끝난 파생값(간지·오행·십성)만 담는다.';
