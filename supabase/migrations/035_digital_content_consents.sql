-- 디지털 콘텐츠(AI 생성) 청약철회 제한 고지·확인 기록
--
-- 이용자가 "열어보기" 앞의 청약철회 제한 안내를 보고 "확인하고 열어보기"를 누른 사실,
-- 어떤 버전의 안내문이었는지, 이후 콘텐츠 생성이 언제 요청·완료(또는 실패)됐는지를 남긴다.
-- 분쟁 때 "고지하고 확인받았다"는 근거가 되도록 서버(DB)에 기록한다.
--
-- * 기록은 RPC로만 쓴다(클라이언트 직접 insert/update 정책 없음). 본인 기록만 조회할 수 있다.
-- * IP 주소는 저장하지 않는다(개인정보 최소화). 필요하면 법률 검토 뒤 별도 컬럼으로 추가한다.
-- * 탈퇴 시 user_id만 비워 행은 남긴다(on delete set null). 보존 기간과 파기 시점은
--   법률 검토 뒤 정하고, 그때까지는 삭제하지 않는다.
-- * 안내문 버전은 src/data/refundPolicy.ts의 WITHDRAWAL_NOTICE_VERSION과 같은 값을 쓴다.
-- * 이 기록이 실패해도 결제·생성은 막지 않는다(클라이언트가 best-effort로 호출).

create table if not exists digital_content_consents (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid references auth.users(id) on delete set null,
  product_code             text not null,
  notice_version           text not null,
  consented_at             timestamptz not null default now(),
  generation_requested_at  timestamptz,
  generation_completed_at  timestamptz,
  generation_status        text check (generation_status in ('requested', 'completed', 'failed'))
);

create index if not exists idx_digital_content_consents_user
  on digital_content_consents(user_id, consented_at desc);

alter table digital_content_consents enable row level security;

create policy "본인 동의 기록 조회" on digital_content_consents
  for select using (auth.uid() = user_id);
-- insert/update/delete 정책을 만들지 않아 클라이언트 직접 쓰기는 막힌다. 아래 RPC(security definer)만 쓴다.

create or replace function record_digital_content_consent(p_product_code text, p_notice_version text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if v_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;
  if not exists (select 1 from product_prices where product_code = p_product_code) then
    raise exception '알 수 없는 상품입니다.';
  end if;
  if p_notice_version is null or length(p_notice_version) = 0 or length(p_notice_version) > 40 then
    raise exception '고지문 버전이 올바르지 않습니다.';
  end if;

  insert into digital_content_consents(user_id, product_code, notice_version)
  values (v_user_id, p_product_code, p_notice_version)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function mark_digital_content_generation(p_consent_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception '로그인이 필요합니다.';
  end if;
  if p_status not in ('requested', 'completed', 'failed') then
    raise exception '상태 값이 올바르지 않습니다.';
  end if;

  update digital_content_consents
  set generation_status = p_status,
      generation_requested_at = case when p_status = 'requested' then now() else generation_requested_at end,
      generation_completed_at = case when p_status in ('completed', 'failed') then now() else generation_completed_at end
  where id = p_consent_id and user_id = v_user_id;
end;
$$;

grant execute on function record_digital_content_consent(text, text) to authenticated;
grant execute on function mark_digital_content_generation(uuid, text) to authenticated;
