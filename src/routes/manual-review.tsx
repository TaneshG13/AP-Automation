import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, Loader2, RefreshCw, AlertCircle, ClipboardCheck, Eye } from "lucide-react";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { StatusBadge } from "@/components/StatusBadge";
import { InvoiceDetailModal } from "@/components/InvoiceDetailModal";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { approveInvoice, fetchReviewQueue, formatCurrency, rejectInvoice, type Invoice } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/manual-review")({
  component: ManualReviewPage,
});

function ManualReviewPage() {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [confirm, setConfirm] = useState<{ inv: Invoice; action: "approve" | "reject" } | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["review-queue"],
    queryFn: fetchReviewQueue,
    refetchInterval: 30_000,
  });
  const items: Invoice[] = data || [];

  const seenRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!data) return;
    const ids = new Set(items.map((i) => String(i.invoice_number || "")).filter(Boolean));
    if (seenRef.current === null) {
      seenRef.current = ids;
      return;
    }
    const newOnes = items.filter((i) => {
      const n = String(i.invoice_number || "");
      return n && !seenRef.current!.has(n);
    });
    if (newOnes.length > 0) {
      newOnes.slice(0, 3).forEach((inv) => {
        toast("New invoice needs review", {
          description: `${inv.invoice_number} — ${inv.vendor_name || "Unknown vendor"}`,
        });
      });
    }
    seenRef.current = ids;
  }, [data, items]);

  const approveMut = useMutation({
    mutationFn: (n: string) => approveInvoice(n),
    onSuccess: () => {
      toast.success("Invoice approved");
      qc.invalidateQueries({ queryKey: ["review-queue"] });
      qc.invalidateQueries({ queryKey: ["registry"] });
    },
    onError: () => toast.error("Failed to approve invoice"),
    onSettled: () => setPendingId(null),
  });
  const rejectMut = useMutation({
    mutationFn: (n: string) => rejectInvoice(n),
    onSuccess: () => {
      toast.success("Invoice rejected");
      qc.invalidateQueries({ queryKey: ["review-queue"] });
      qc.invalidateQueries({ queryKey: ["registry"] });
    },
    onError: () => toast.error("Failed to reject invoice"),
    onSettled: () => setPendingId(null),
  });

  const handleApprove = (invoice: Invoice) => setConfirm({ inv: invoice, action: "approve" });
  const handleReject = (invoice: Invoice) => setConfirm({ inv: invoice, action: "reject" });

  const runConfirm = () => {
    if (!confirm) return;
    const num = String(confirm.inv.invoice_number || "");
    if (!num) { toast.error("Missing invoice number"); setConfirm(null); return; }
    setPendingId(num);
    if (confirm.action === "approve") approveMut.mutate(num);
    else rejectMut.mutate(num);
    setConfirm(null);
  };

  return (
    <ProtectedLayout title="Manual Review Queue" subtitle="Human-in-the-loop invoice approval console">
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{items.length} invoice{items.length === 1 ? "" : "s"} awaiting review</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-8 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading queue…
            </div>
          ) : isError ? (
            <div className="p-12 text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-3 text-destructive" />
              <p className="text-sm mb-3">Failed to load review queue.</p>
              <Button onClick={() => refetch()} variant="outline" size="sm">Retry</Button>
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Check className="h-8 w-8 mx-auto mb-3 text-success" />
              All clear — no invoices need review.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>PO Ref</TableHead>
                  <TableHead>Review Reasons</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((inv, i) => {
                  const num = String(inv.invoice_number || "");
                  const isPending = pendingId === num;
                  const reasons = Array.isArray(inv.review_reasons)
                    ? inv.review_reasons.join(", ")
                    : (inv.review_reasons as string) || "—";
                  return (
                    <TableRow key={`${num}-${i}`}>
                      <TableCell className="font-medium">{num || "—"}</TableCell>
                      <TableCell>{inv.vendor_name || "—"}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(inv.amount, inv.currency)}</TableCell>
                      <TableCell>{inv.currency || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{inv.po_reference || "—"}</TableCell>
                      <TableCell className="max-w-[280px] truncate text-muted-foreground" title={reasons}>{reasons}</TableCell>
                      <TableCell><StatusBadge value={(inv.validation_status as string) || "PENDING_REVIEW"} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setSelected(inv)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            className="bg-success text-success-foreground hover:bg-success/90"
                            onClick={() => handleApprove(inv)}
                            disabled={isPending}
                          >
                            {isPending && approveMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(inv)}
                            disabled={isPending}
                          >
                            {isPending && rejectMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5 mr-1" />}
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <InvoiceDetailModal invoice={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.action === "approve" ? "Approve invoice?" : "Reject invoice?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Invoice <span className="font-medium text-foreground">{confirm?.inv.invoice_number}</span> from{" "}
              <span className="font-medium text-foreground">{confirm?.inv.vendor_name}</span>. This action will be recorded in the AP system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={runConfirm}
              className={confirm?.action === "reject" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              Confirm {confirm?.action === "approve" ? "Approve" : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProtectedLayout>
  );
}
