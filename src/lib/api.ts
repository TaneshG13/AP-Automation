const BASE = "https://taneshg13.app.n8n.cloud/webhook";

export const ENDPOINTS = {
  registry: `${BASE}/invoice-registry`,
  reviewQueue: `${BASE}/API%20-%20Manual%20Review%20Queue`,
  approve: `${BASE}/manual-approve`,
  reject: `${BASE}/manual-reject`,
};

async function jsonFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const text = await res.text();
  if (!text) return [] as unknown as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return [] as unknown as T;
  }
}

export interface Invoice {
  invoice_number?: string;
  vendor_name?: string;
  invoice_date?: string;
  currency?: string;
  amount?: number | string;
  tax?: number | string;
  po_reference?: string;
  payment_terms?: string;
  validation_status?: string;
  decision?: string;
  review_reasons?: string | string[];
  duplicate_check?: string;
  balance_validation?: string;
  tolerance_validation?: string;
  [k: string]: unknown;
}

function normalizeList(data: unknown): Invoice[] {
  if (Array.isArray(data)) return data as Invoice[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const k of ["data", "invoices", "results", "items"]) {
      if (Array.isArray(obj[k])) return obj[k] as Invoice[];
    }
    return [obj as Invoice];
  }
  return [];
}

export async function fetchRegistry(): Promise<Invoice[]> {
  const d = await jsonFetch<unknown>(ENDPOINTS.registry);
  return normalizeList(d);
}
export async function fetchReviewQueue(): Promise<Invoice[]> {
  const d = await jsonFetch<unknown>(ENDPOINTS.reviewQueue);
  return normalizeList(d);
}
export async function approveInvoice(invoice_number: string) {
  return jsonFetch<unknown>(ENDPOINTS.approve, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invoice_number }),
  });
}
export async function rejectInvoice(invoice_number: string) {
  return jsonFetch<unknown>(ENDPOINTS.reject, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invoice_number }),
  });
}

export function formatCurrency(amount: unknown, currency?: string) {
  const n = typeof amount === "string" ? Number(amount) : (amount as number);
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency || ""} ${n.toFixed(2)}`.trim();
  }
}
