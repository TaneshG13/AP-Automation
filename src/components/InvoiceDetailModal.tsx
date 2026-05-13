import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StatusBadge } from "./StatusBadge";
import { formatCurrency, type Invoice } from "@/lib/api";

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
      <div className="text-sm font-medium text-foreground mt-1 break-words">{value ?? "—"}</div>
    </div>
  );
}

export function InvoiceDetailModal({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  if (!invoice) return null;
  const reasons = invoice.review_reasons;
  const reasonsArr = Array.isArray(reasons) ? reasons : reasons ? [String(reasons)] : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Invoice {invoice.invoice_number || "—"}</DialogTitle>
          <DialogDescription>{invoice.vendor_name || "Unknown vendor"}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Invoice Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Invoice Number" value={invoice.invoice_number} />
              <Field label="Vendor" value={invoice.vendor_name} />
              <Field label="Invoice Date" value={invoice.invoice_date} />
              <Field label="Currency" value={invoice.currency} />
              <Field label="Amount" value={formatCurrency(invoice.amount, invoice.currency)} />
              <Field label="Tax" value={invoice.tax != null ? formatCurrency(invoice.tax, invoice.currency) : "—"} />
              <Field label="PO Reference" value={invoice.po_reference} />
              <Field label="Payment Terms" value={invoice.payment_terms} />
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Validation Results</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Validation Status" value={<StatusBadge value={invoice.validation_status as string} />} />
              <Field label="Final Decision" value={<StatusBadge value={invoice.decision as string} />} />
              <Field label="Duplicate Detection" value={invoice.duplicate_check as string} />
              <Field label="Balance Validation" value={invoice.balance_validation as string} />
              <Field label="Tolerance Validation" value={invoice.tolerance_validation as string} />
            </div>
          </section>

          {reasonsArr.length > 0 && (
            <section className="rounded-lg border border-warning/30 bg-warning/5 p-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">Review Reasons</h3>
              <ul className="list-disc list-inside text-sm text-foreground/80 space-y-1">
                {reasonsArr.map((r, i) => (
                  <li key={i}>{String(r)}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
