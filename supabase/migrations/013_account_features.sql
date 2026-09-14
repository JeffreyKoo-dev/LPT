-- Phase 3 — "내 계정" 화면 기능 지원 (공유 링크 소유자 추적 + 삭제 권한)
--
-- 지금까지 shared_profiles는 "누가 만들었는지" 기록하지 않았다(비로그인도
-- 만들 수 있는 기능이라 원래 그렇게 설계함). "내 계정 > 공유 링크 관리"
-- 화면에서 본인이 만든 링크만 골라 보여주고 지울 수 있으려면, 로그인한
-- 상태로 만든 링크에 한해 소유자를 남겨야 한다. 비로그인으로 만든 링크는
-- user_id가 null로 남고, 계정 화면에는 당연히 나타나지 않는다(원래도
-- 추적 불가능한 게 맞다 — 비로그인 공유의 특성).

alter table shared_profiles
  add column if not exists user_id uuid references auth.users(id) on delete set null;

-- 본인이 만든 공유 링크는 직접 삭제(공개 비활성화)할 수 있게 한다.
create policy "본인 공유 프로필만 삭제" on shared_profiles
  for delete using (auth.uid() = user_id);
