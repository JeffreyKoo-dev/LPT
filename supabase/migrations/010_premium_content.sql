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
