-- Phase 3 — 쿠팡파트너스 상품검색 캐시
-- 쿠팡파트너스 Search API는 시간당 최대 10회 호출 제한이 있어, 사용자
-- 요청마다 직접 호출하지 않고 여기 캐싱한 결과를 재사용한다. Edge Function
-- (coupang-search)이 캐시가 오래되면(20시간 이상) 그때만 실제 API를 호출해
-- 갱신한다.

create table if not exists coupang_product_cache (
  keyword text primary key,
  products jsonb not null,
  fetched_at timestamptz not null default now()
);

alter table coupang_product_cache enable row level security;

-- 캐시된 상품 정보는 개인정보가 아니라 공개 상품 데이터라 조회는 누구나 가능하게 한다.
-- 쓰기는 Edge Function이 service_role로만 수행하므로 별도 insert/update 정책을 만들지 않는다.
create policy "쿠팡 캐시 공개 조회" on coupang_product_cache
  for select using (true);
