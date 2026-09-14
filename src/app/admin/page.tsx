"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeading } from "@/components/common/PageHeading";
import { Card, CardTitle, CardDescription } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { TextField } from "@/components/form/TextField";
import { GuardScreen } from "@/components/common/GuardScreen";
import { useRequireLogin } from "@/lib/useRequireLogin";
import {
  getAdminOverview,
  getModerationReports,
  getPurchaseOrders,
  getSystemStatus,
  getProductSales,
  searchUsers,
  adjustUserCash,
  AdminOverview,
  ModerationReportRow,
  PurchaseOrderRow,
  SystemStatusItem,
  ProductSalesRow,
  UserLookupResult,
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

const PRODUCT_LABEL: Record<string, string> = {
  daily_card_unlock: "오늘의 카드 즉시해제",
  premium_report: "정밀 사주 리포트",
  compatibility_deep: "심층 궁합 분석",
  daeun_seun: "대운·세운 해석",
};

type LoadState = "loading" | "forbidden" | "ready" | "error";

export default function AdminPage() {
  const router = useRouter();
  const authGate = useRequireLogin();
  const [state, setState] = useState<LoadState>("loading");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [reports, setReports] = useState<ModerationReportRow[]>([]);
  const [orders, setOrders] = useState<PurchaseOrderRow[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatusItem[]>([]);
  const [productSales, setProductSales] = useState<ProductSalesRow[]>([]);

  useEffect(() => {
    if (!authGate.configured || authGate.loading || authGate.redirecting) return;

    Promise.all([
      getAdminOverview(),
      getModerationReports(),
      getPurchaseOrders(),
      getSystemStatus(),
      getProductSales(),
    ])
      .then(([overviewData, reportsData, ordersData, statusData, salesData]) => {
        setOverview(overviewData);
        setReports(reportsData);
        setOrders(ordersData);
        setSystemStatus(statusData);
        setProductSales(salesData);
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
        <CardTitle>연동 설정 상태</CardTitle>
        <CardDescription className="mt-1">
          매번 서버 파일을 열어보지 않아도 뭐가 켜져 있는지 한눈에 볼 수 있어요.
        </CardDescription>
        <div className="mt-4 flex flex-col gap-1.5">
          {systemStatus.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{item.name}</span>
              <span className={item.configured ? "text-emerald-700" : "text-muted"}>
                {item.configured ? "설정됨" : "미설정"}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-6">
        <CardTitle>상품별 판매 현황</CardTitle>
        <CardDescription className="mt-1">어떤 유료 콘텐츠가 잘 팔리는지 확인해요.</CardDescription>
        {productSales.length === 0 ? (
          <p className="mt-4 text-sm text-muted">아직 판매 내역이 없어요.</p>
        ) : (
          <div className="mt-4 flex flex-col gap-2">
            {productSales.map((s) => (
              <div key={s.productCode} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{PRODUCT_LABEL[s.productCode] ?? s.productCode}</span>
                <span className="text-muted">
                  {s.count.toLocaleString()}건 · {s.totalCash.toLocaleString()}캐시
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <UserLookupSection />

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

/** 회원 조회 + 수동 캐시 조정. "결제했는데 캐시가 안 들어왔어요" 같은 CS 대응용. */
function UserLookupSection() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserLookupResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    try {
      const users = await searchUsers(query.trim());
      setResults(users);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "검색에 실패했어요.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <Card className="mt-6">
      <CardTitle>회원 조회 / 캐시 수동 조정</CardTitle>
      <CardDescription className="mt-1">
        닉네임으로 찾아서, 보유 캐시와 최근 거래내역을 확인하고 필요하면 직접 조정할 수 있어요.
      </CardDescription>

      <form onSubmit={handleSearch} className="mt-4 flex gap-2">
        <TextField
          label="닉네임 검색"
          name="nickname"
          placeholder="닉네임으로 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" disabled={searching}>
          {searching ? "검색 중…" : "검색"}
        </Button>
      </form>
      {searchError && <p className="mt-2 text-xs text-red-600">{searchError}</p>}

      {results && results.length === 0 && (
        <p className="mt-4 text-sm text-muted">일치하는 회원이 없어요.</p>
      )}

      {results && results.length > 0 && (
        <div className="mt-4 flex flex-col gap-4">
          {results.map((user) => (
            <UserResultCard key={user.user_id} user={user} />
          ))}
        </div>
      )}
    </Card>
  );
}

function UserResultCard({ user }: { user: UserLookupResult }) {
  const [balance, setBalance] = useState(user.cashBalance);
  const [transactions, setTransactions] = useState(user.recentTransactions);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleAdjust() {
    const parsed = Number(amount);
    if (!parsed || Number.isNaN(parsed)) {
      setError("금액을 입력해주세요 (지급은 양수, 차감은 음수).");
      return;
    }
    setError(null);
    setStatus("saving");
    try {
      const result = await adjustUserCash(user.user_id, parsed, reason);
      setBalance(result.newBalance);
      // 새로고침 없이도 바로 보이도록, 방금 적용한 조정 내역을 목록 맨 위에 즉시 추가한다.
      setTransactions((prev) => [
        {
          type: parsed >= 0 ? "refund" : "spend",
          amount: parsed,
          balance_after: result.newBalance,
          description: reason || "관리자 수동 조정",
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
      setAmount("");
      setReason("");
      setDone(true);
      setTimeout(() => setDone(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "조정에 실패했어요.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-foreground">{user.nickname}</p>
          <p className="text-xs text-muted">
            {user.lpt_type_id ?? "유형 미확정"} · 가입 {new Date(user.created_at).toLocaleDateString("ko-KR")}
          </p>
        </div>
        <p className="text-sm font-semibold text-foreground">{balance.toLocaleString()}캐시</p>
      </div>

      {transactions.length > 0 && (
        <div className="mt-3 flex flex-col gap-1 border-t border-border pt-2">
          {transactions.slice(0, 5).map((tx, i) => (
            <div key={i} className="flex justify-between text-xs text-muted">
              <span>
                {new Date(tx.created_at).toLocaleDateString("ko-KR")} · {tx.description ?? tx.type}
              </span>
              <span>
                {tx.amount > 0 ? "+" : ""}
                {tx.amount.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <TextField
            label="조정 금액"
            name={`amount-${user.user_id}`}
            placeholder="+1000 또는 -500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <TextField
            label="사유"
            name={`reason-${user.user_id}`}
            placeholder="예: 결제 오류 보상"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <Button variant="secondary" onClick={handleAdjust} disabled={status === "saving"}>
          {status === "saving" ? "처리 중…" : "적용"}
        </Button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {done && <p className="mt-1 text-xs text-emerald-700">반영됐어요.</p>}
    </div>
  );
}
