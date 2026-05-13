import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, FileText, CheckCircle2, Clock, ThumbsUp, ThumbsDown, DollarSign, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { InvoiceDetailModal } from "@/components/InvoiceDetailModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchRegistry, formatCurrency, type Invoice } from "@/lib/api";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

const PAGE_SIZE = 10;

function DashboardPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("date_desc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Invoice | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["registry"],
    queryFn: fetchRegistry,
    refetchInterval: 30_000,
  });

  const invoices: Invoice[] = data || [];

  const seenRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!data) return;
    const ids = new Set(invoices.map((i) => String(i.invoice_number || "")).filter(Boolean));
    if (seenRef.current === null) {
      seenRef.current = ids;
      return;
    }
    const newOnes = invoices.filter((i) => {
      const n = String(i.invoice_number || "");
      return n && !seenRef.current!.has(n);
    });
    if (newOnes.length > 0) {
      newOnes.slice(0, 3).forEach((inv) => {
        toast.success("New invoice received", {
          description: `${inv.invoice_number} — ${inv.vendor_name || "Unknown vendor"} · ${formatCurrency(inv.amount, inv.currency)}`,
        });
      });
      if (newOnes.length > 3) {
        toast.success(`+${newOnes.length - 3} more new invoices`);
      }
    }
    seenRef.current = ids;
  }, [data, invoices]);

  const stats = useMemo(() => {
    const s = { total: invoices.length, auto: 0, pending: 0, mApproved: 0, mRejected: 0, amount: 0 };
    let currency = "USD";
    for (const inv of invoices) {
      const status = String(inv.validation_status || inv.decision || "").toUpperCase();
      if (status.includes("AUTO_APPROVED") || status === "AUTO_APPROVE") s.auto++;
      if (status.includes("PENDING") || status === "REVIEW_REQUIRED") s.pending++;
      if (status === "MANUAL_APPROVED") s.mApproved++;
      if (status === "MANUAL_REJECTED" || status === "REJECTED") s.mRejected++;
      const a = typeof inv.amount === "string" ? Number(inv.amount) : (inv.amount as number);
      if (Number.isFinite(a)) s.amount += a;
      if (inv.currency) currency = String(inv.currency);
    }
    return { ...s, currency };
  }, [invoices]);

  const filtered = useMemo(() => {
    let list = invoices;
    if (statusFilter !== "ALL") {
      list = list.filter((i) => String(i.validation_status || "").toUpperCase() === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) =>
        [i.invoice_number, i.vendor_name, i.po_reference]
          .some((v) => String(v || "").toLowerCase().includes(q))
      );
    }
    list = [...list].sort((a, b) => {
      switch (sortBy) {
        case "amount_desc":
          return Number(b.amount || 0) - Number(a.amount || 0);
        case "amount_asc":
          return Number(a.amount || 0) - Number(b.amount || 0);
        case "date_asc":
          return String(a.invoice_date || "").localeCompare(String(b.invoice_date || ""));
        case "date_desc":
        default:
          return String(b.invoice_date || "").localeCompare(String(a.invoice_date || ""));
      }
    });
    return list;
  }, [invoices, search, statusFilter, sortBy]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <ProtectedLayout title="Dashboard" subtitle="AI-powered Accounts Payable operations overview">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <KpiCard icon={FileText} label="Total Invoices" value={stats.total} tone="info" />
        <KpiCard icon={CheckCircle2} label="Auto Approved" value={stats.auto} tone="success" />
        <KpiCard icon={Clock} label="Pending Review" value={stats.pending} tone="warning" />
        <KpiCard icon={ThumbsUp} label="Manual Approved" value={stats.mApproved} tone="info" />
        <KpiCard icon={ThumbsDown} label="Manual Rejected" value={stats.mRejected} tone="destructive" />
        <KpiCard icon={DollarSign} label="Total Amount" value={formatCurrency(stats.amount, stats.currency)} tone="primary" />
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search invoice, vendor, PO…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="AUTO_APPROVED">Auto Approved</SelectItem>
              <SelectItem value="PENDING_REVIEW">Pending Review</SelectItem>
              <SelectItem value="MANUAL_APPROVED">Manual Approved</SelectItem>
              <SelectItem value="MANUAL_REJECTED">Manual Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date_desc">Newest first</SelectItem>
              <SelectItem value="date_asc">Oldest first</SelectItem>
              <SelectItem value="amount_desc">Amount (high → low)</SelectItem>
              <SelectItem value="amount_asc">Amount (low → high)</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <SkeletonRows />
          ) : isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : filtered.length === 0 ? (
            <EmptyState />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>PO Ref</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Decision</TableHead>
                  <TableHead>Payment Terms</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((inv, idx) => (
                  <TableRow
                    key={`${inv.invoice_number}-${idx}`}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => setSelected(inv)}
                  >
                    <TableCell className="font-medium">{inv.invoice_number || "—"}</TableCell>
                    <TableCell>{inv.vendor_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{inv.invoice_date || "—"}</TableCell>
                    <TableCell>{inv.currency || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(inv.amount, inv.currency)}</TableCell>
                    <TableCell className="text-muted-foreground">{inv.po_reference || "—"}</TableCell>
                    <TableCell><StatusBadge value={inv.validation_status as string} /></TableCell>
                    <TableCell><StatusBadge value={inv.decision as string} /></TableCell>
                    <TableCell className="text-muted-foreground">{inv.payment_terms || "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {pageCount > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border text-sm">
            <span className="text-muted-foreground">
              Page {page} of {pageCount} · {filtered.length} invoices
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <Button variant="outline" size="sm" disabled={page === pageCount} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <InvoiceDetailModal invoice={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
    </ProtectedLayout>
  );
}

function KpiCard({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; tone: "success" | "warning" | "info" | "destructive" | "primary" }) {
  const tones: Record<string, string> = {
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning-foreground",
    info: "bg-info/10 text-info",
    destructive: "bg-destructive/10 text-destructive",
    primary: "bg-primary/10 text-primary",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="p-8 flex items-center justify-center text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading invoices…
    </div>
  );
}
function EmptyState() {
  return (
    <div className="p-12 text-center text-muted-foreground">
      <FileText className="h-8 w-8 mx-auto mb-3 opacity-50" />
      No invoices match your filters.
    </div>
  );
}
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="p-12 text-center">
      <AlertCircle className="h-8 w-8 mx-auto mb-3 text-destructive" />
      <p className="text-sm text-foreground mb-3">Failed to load invoices.</p>
      <Button onClick={onRetry} variant="outline" size="sm">Retry</Button>
    </div>
  );
}
