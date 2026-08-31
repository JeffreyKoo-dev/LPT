"use client";

import { useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { GuardScreen } from "@/components/common/GuardScreen";
import { ShareCard } from "@/components/share/ShareCard";
import { ShareActions } from "@/components/share/ShareActions";
import { useGrowthSession } from "@/lib/useGrowthSession";
import { PageHeading } from "@/components/common/PageHeading";
import {
  buildBadgeShareData,
  buildCharacterShareData,
  buildLevelShareData,
  parseShareId,
} from "@/lib/share";
import { getBadgeMeta } from "@/data/badges";
import { getStorage, STORAGE_KEYS } from "@/lib/storage";
import { BasicInfo, Gender } from "@/types/user";

export default function SharePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const session = useGrowthSession();
  const cardRef = useRef<HTMLDivElement>(null);

  const shareParam = useMemo(() => parseShareId(params.id), [params.id]);
  const gender: Gender = getStorage().get<BasicInfo>(STORAGE_KEYS.basicInfo)?.gender ?? "male";

  if (session.status === "loading") {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center text-sm text-muted">
        공유 카드를 준비하는 중입니다…
      </div>
    );
  }

  if (session.status === "missing-analysis" || !session.typeMeta || !session.fantasyClass) {
    return (
      <GuardScreen
        title="공유할 카드가 아직 없어요"
        description="기본 정보 입력과 설문을 완료하면 캐릭터 카드를 공유할 수 있어요."
        actionLabel="시작하러 가기"
        onAction={() => router.push("/start")}
      />
    );
  }

  const { nickname, typeMeta, fantasyClass } = session;

  const shareData = (() => {
    if (shareParam.kind === "character") {
      return buildCharacterShareData(nickname, typeMeta, fantasyClass, gender);
    }
    if (shareParam.kind === "level") {
      return buildLevelShareData(nickname, shareParam.level);
    }
    if (shareParam.kind === "badge") {
      const badgeMeta = getBadgeMeta(shareParam.badgeId);
      if (!badgeMeta) return null;
      return buildBadgeShareData(nickname, badgeMeta);
    }
    return null;
  })();

  if (!shareData) {
    return (
      <GuardScreen
        title="공유 카드를 찾을 수 없어요"
        description="유효하지 않은 공유 링크입니다."
        actionLabel="대시보드로"
        onAction={() => router.push("/dashboard")}
      />
    );
  }

  return (
    <div className="mx-auto max-w-md px-5 py-14">
      <div className="mb-6">
        <PageHeading
          label="공유 카드"
          title="이미지로 저장하고 공유해보세요"
          description="생년월일, 출생시간, 성별, 설문 응답은 카드에 포함되지 않습니다."
        />
      </div>

      <div className="flex justify-center">
        <ShareCard ref={cardRef} data={shareData} />
      </div>

      <div className="mt-6">
        <ShareActions
          targetRef={cardRef}
          fileName={`lpt-${shareParam.kind}`}
          shareTitle={shareData.heading}
          shareDescription={shareData.subheading}
        />
      </div>
    </div>
  );
}
