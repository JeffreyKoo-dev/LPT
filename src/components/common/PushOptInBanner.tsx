"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Share } from "lucide-react";
import { Card, CardTitle, CardDescription } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { InlineError } from "@/components/common/InlineError";
import { useSupabaseSession } from "@/lib/useSupabaseSession";
import {
  getExistingSubscription,
  isPushConfigured,
  isPushSupported,
  subscribeToPush,
} from "@/lib/push";

const DISMISS_KEY = "lpt.pushOptInDismissedAt";
const DISMISS_DAYS = 14;

function isDismissedRecently(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;
    return Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function rememberDismiss() {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // 저장소를 못 쓰는 환경(시크릿 모드 등)에서는 이번 방문에만 숨긴다
  }
}

/**
 * 아이폰/아이패드 Safari는 "홈 화면에 추가"로 설치한 웹앱에서만 웹 푸시를 지원한다.
 * 일반 탭에서는 PushManager 자체가 없어 isPushSupported()가 false이므로, 이 경우엔
 * 알림 버튼 대신 설치 방법을 안내한다.
 */
function needsIosInstall(): boolean {
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && navigator.maxTouchPoints > 1);
  if (!isIos) return false;
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return !standalone;
}

const COPY = {
  dashboard: {
    title: "알림으로 받아보세요",
    description:
      "이번 달 운세처럼 매달 새로 확인할 수 있는 콘텐츠를 깜빡하지 않도록 알려드려요. 내 계정에서 언제든 끌 수 있어요.",
  },
  result: {
    title: "다음 운세도 놓치지 마세요",
    description:
      "매달 새로 바뀌는 흐름이라, 아직 확인하지 않은 달이 있으면 브라우저 알림으로 알려드려요.",
  },
} as const;

interface PushOptInBannerProps {
  variant: keyof typeof COPY;
}

/**
 * 웹 푸시 알림 켜기를 유도하는 배너. 아래 조건을 전부 만족할 때만 보인다.
 * - 로그인 상태 (구독 정보가 계정에 저장되므로 비로그인에게는 의미가 없다)
 * - 브라우저가 푸시를 지원하고 VAPID 키가 설정됨 (미설정이면 자동으로 숨김)
 * - 브라우저 알림 권한이 "거부"가 아님 (거부 상태에선 코드로 다시 물어볼 수 없다)
 * - 이 브라우저가 아직 구독 중이 아님
 * - 최근 14일 안에 "나중에"를 누르지 않음
 */
export function PushOptInBanner({ variant }: PushOptInBannerProps) {
  const { loading, user } = useSupabaseSession();
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [working, setWorking] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !user) return;
    if (!isPushConfigured()) return;
    if (!isPushSupported()) {
      if (isDismissedRecently() || !needsIosInstall()) return;
      let cancelledIos = false;
      Promise.resolve().then(() => {
        if (!cancelledIos) setIosHint(true);
      });
      return () => {
        cancelledIos = true;
      };
    }
    if (Notification.permission === "denied") return;
    if (isDismissedRecently()) return;

    let cancelled = false;
    getExistingSubscription().then((sub) => {
      if (!cancelled && !sub) setVisible(true);
    });
    return () => {
      cancelled = true;
    };
  }, [loading, user]);

  if (iosHint) {
    return (
      <Card>
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-fate" />
          <CardTitle>아이폰은 홈 화면에 추가하면 알림을 받을 수 있어요</CardTitle>
        </div>
        <CardDescription className="mt-2 break-keep">
          Safari 하단의 공유 버튼(
          <Share className="inline h-3.5 w-3.5 align-text-bottom" />
          )을 누르고 &lsquo;홈 화면에 추가&rsquo;를 선택하세요. 추가한 아이콘으로 다시 접속해 알림을 켜면
          매달 운세 알림을 받아볼 수 있어요.
        </CardDescription>
        <div className="mt-4">
          <Button
            variant="ghost"
            onClick={() => {
              rememberDismiss();
              setIosHint(false);
            }}
          >
            알겠어요
          </Button>
        </div>
      </Card>
    );
  }

  if (!visible) return null;

  async function handleSubscribe() {
    setError(null);
    setWorking(true);
    const result = await subscribeToPush();
    setWorking(false);
    if (result.ok) {
      setDone(true);
    } else {
      setError(result.error ?? "알림을 켜지 못했어요.");
    }
  }

  function handleDismiss() {
    rememberDismiss();
    setVisible(false);
  }

  if (done) {
    return (
      <Card>
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-fate" />
          <CardTitle>알림을 켰어요</CardTitle>
        </div>
        <CardDescription className="mt-1">
          설정은 내 계정에서 언제든 바꿀 수 있어요.
        </CardDescription>
      </Card>
    );
  }

  const copy = COPY[variant];

  return (
    <Card>
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-fate" />
        <CardTitle>{copy.title}</CardTitle>
      </div>
      <CardDescription className="mt-2">{copy.description}</CardDescription>
      <div className="mt-4 flex gap-2">
        <Button className="flex-1" onClick={handleSubscribe} disabled={working}>
          {working ? "처리 중…" : "알림 받기"}
        </Button>
        <Button variant="ghost" onClick={handleDismiss} disabled={working}>
          나중에
        </Button>
      </div>
      {error && <InlineError>{error}</InlineError>}
    </Card>
  );
}
