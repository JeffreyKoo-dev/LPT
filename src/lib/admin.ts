import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export interface AdminOverview {
  totalUsers: number;
  recentSignups: number;
  totalRevenue: number;
  totalOrders: number;
  reportCount: number;
  unreviewedRefundCount: number;
}

export interface ModerationReportRow {
  id: number;
  field_name: string;
  content_snippet: string;
  category: string;
  severity: string;
  created_at: string;
}

export interface PurchaseOrderRow {
  id: string;
  krw_amount: number;
  cash_amount: number;
  status: string;
  pg_provider: string;
  created_at: string;
  completed_at: string | null;
}

/** 관리자 API는 전부 로그인 토큰이 필요하다 — 현재 세션의 access_token을 Authorization 헤더로 붙인다. */
async function adminFetch<T>(path: string): Promise<T> {
  if (!isSupabaseConfigured()) throw new Error("이 기능을 사용할 수 없는 환경입니다.");

  const supabase = getSupabaseClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("로그인이 필요합니다.");

  const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "요청에 실패했어요.");
  return body as T;
}

export const getAdminOverview = () => adminFetch<AdminOverview>("/api/admin/overview");
export const getModerationReports = () =>
  adminFetch<{ reports: ModerationReportRow[] }>("/api/admin/moderation-reports").then((r) => r.reports);
export const getPurchaseOrders = () =>
  adminFetch<{ orders: PurchaseOrderRow[] }>("/api/admin/purchase-orders").then((r) => r.orders);

export interface UserLookupResult {
  user_id: string;
  nickname: string;
  lpt_type_id: string | null;
  xp: number;
  created_at: string;
  cashBalance: number;
  bonusBalance: number;
  recentTransactions: {
    type: string;
    amount: number;
    balance_after: number;
    description: string | null;
    created_at: string;
  }[];
}

export const searchUsers = (nickname: string) =>
  adminFetch<{ users: UserLookupResult[] }>(
    `/api/admin/user-lookup?nickname=${encodeURIComponent(nickname)}`
  ).then((r) => r.users);

async function adminPost<T>(path: string, body: unknown): Promise<T> {
  if (!isSupabaseConfigured()) throw new Error("이 기능을 사용할 수 없는 환경입니다.");

  const supabase = getSupabaseClient();
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("로그인이 필요합니다.");

  const res = await fetch(path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const responseBody = await res.json();
  if (!res.ok) throw new Error(responseBody.error ?? "요청에 실패했어요.");
  return responseBody as T;
}

export const adjustUserCash = (userId: string, amount: number, reason: string) =>
  adminPost<{ newBalance: number }>("/api/admin/adjust-cash", { userId, amount, reason });

export interface SystemStatusItem {
  name: string;
  configured: boolean;
}

export const getSystemStatus = () =>
  adminFetch<{ items: SystemStatusItem[] }>("/api/admin/system-status").then((r) => r.items);

export interface ProductSalesRow {
  productCode: string;
  count: number;
  totalCash: number;
}

export const getProductSales = () =>
  adminFetch<{ sales: ProductSalesRow[] }>("/api/admin/product-sales").then((r) => r.sales);

export interface RefundEventRow {
  id: number;
  order_id: string;
  user_id: string;
  krw_amount: number;
  cash_amount_granted: number;
  cash_amount_recovered: number;
  shortfall: number;
  reviewed: boolean;
  created_at: string;
}

export const getRefundEvents = () =>
  adminFetch<{ events: RefundEventRow[] }>("/api/admin/refund-events").then((r) => r.events);

export const markRefundEventReviewed = (eventId: number) =>
  adminPost<{ ok: boolean }>("/api/admin/refund-events", { eventId });
