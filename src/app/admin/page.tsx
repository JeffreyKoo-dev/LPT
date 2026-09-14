"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeading } from "@/components/common/PageHeading";
import { Card, CardTitle, CardDescription } from "@/components/common/Card";
import { GuardScreen } from "@/components/common/GuardScreen";
import { useRequireLogin } from "@/lib/useRequireLogin";
import {
  getAdminOverview,
  getModerationReports,
  getPurchaseOrders,
  AdminOverview,
  ModerationReportRow,
  PurchaseOrderRow,
} from "@/lib/admin";

const CATEGORY_LABEL: Record<string, string> = {
  religious: "종교",
  sexual: "성적",
  racial: "인종",
  disability: "장애",
  abusive: "일반 욕설",
  other: "기타",
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "결제 대기",
  completed: "완료",
  failed: "실패",
  cancelled: "취소",
};

type LoadState = "loading" | "forbidden" | "ready" | "error";

export default function AdminPage() {
  const router = useRouter();
  const authGate = useRequireLogin();
  const [state, setState] = useState<LoadState>("loading");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [reports, setReports] = useState<ModerationReportRow[]>([]);
  const [orders, setOrders] = useState<PurchaseOrderRow[]>([]);

  useEffect(() => {
    if (!authGate.configured || authGate.loading || authGate.redirecting) return;

    Promise.all([getAdminOverview(), getModerationReports(), getPurchaseOrders()])
      .then(([overviewData, reportsData, ordersData]) => {
        setOverview(overviewData);
        setReports(reportsData);
        setOrders(ordersData);
        setState("ready");
      })
      .catch((err) => {
        if (err instanceof Error && err.message === "권한이 없습니다.") {
          setState("forbidden");
        } else {
          setState("error");
        }
      });
  }, [authGate.configured, authGate.loading, authGate.redirecting]);

  if (authGate.configured && (authGate.loading || authGate.redirecting)) {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center text-sm text-muted">
        로그인 확인 중입니다…
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="mx-auto max-w-xl px-5 py-24 text-center text-sm text-muted">
        불러오는 중입니다…
      </div>
    );
  }

  if (state === "forbidden") {
    return (
      <GuardScreen
        title="접근 권한이 없어요"
        description="이 페이지는 관리자 계정만 볼 수 있어요."
        actionLabel="홈으로"
        onAction={() => router.push("/")}
      />
    );
  }

  if (state === "error" || !overview) {
    return (
      <GuardScreen
        title="불러오지 못했어요"
        description="잠시 후 다시 시도해주세요."
        actionLabel="새로고침"
        onAction={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-14">
      <PageHeading label="관리자" title="운영 현황" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="전체 가입자" value={overview.totalUsers.toLocaleString()} />
        <StatCard label="최근 7일 가입" value={overview.recentSignups.toLocaleString()} />
        <StatCard label="누적 결제 건수" value={overview.totalOrders.toLocaleString()} />
        <StatCard label="누적 결제 금액" value={`${overview.totalRevenue.toLocaleString()}원`} />
      </div>

      <Card className="mt-6">
        <CardTitle>콘텐츠 감수 신고 내역</CardTitle>
        <CardDescription className="mt-1">
          AI 검수에서 문제로 판단해 차단한 입력 기록이에요 (최근 100건).
        </CardDescription>
        {reports.length === 0 ? (
          <p className="mt-4 text-sm text-muted">신고된 내역이 없어요.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {reports.map((r) => (
              <div key={r.id} className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">
                    {CATEGORY_LABEL[r.category] ?? r.category}
                  </span>
                  <span className="text-xs text-muted">
                    {new Date(r.created_at).toLocaleString("ko-KR")}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  [{r.field_name}] {r.content_snippet}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mt-6">
        <CardTitle>결제 내역</CardTitle>
        <CardDescription className="mt-1">최근 100건.</CardDescription>
        {orders.length === 0 ? (
          <p className="mt-4 text-sm text-muted">결제 내역이 없어요.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {orders.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm"
              >
                <div>
                  <p className="text-foreground">
                    {o.krw_amount.toLocaleString()}원 → {o.cash_amount.toLocaleString()}캐시
                  </p>
                  <p className="text-xs text-muted">
                    {o.pg_provider} · {new Date(o.created_at).toLocaleString("ko-KR")}
                  </p>
                </div>
                <span
                  className={
                    o.status === "completed"
                      ? "text-xs font-medium text-emerald-700"
                      : o.status === "failed" || o.status === "cancelled"
                        ? "text-xs font-medium text-red-600"
                        : "text-xs font-medium text-muted"
                  }
                >
                  {ORDER_STATUS_LABEL[o.status] ?? o.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}
