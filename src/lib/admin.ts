import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";

export interface AdminOverview {
  totalUsers: number;
  recentSignups: number;
  totalRevenue: number;
  totalOrders: number;
  reportCount: number;
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
