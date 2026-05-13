import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<string, string> = {
  AUTO_APPROVED: "bg-success/10 text-success border-success/20",
  MANUAL_APPROVED: "bg-info/10 text-info border-info/20",
  PENDING_REVIEW: "bg-warning/15 text-warning-foreground border-warning/30",
  MANUAL_REJECTED: "bg-destructive/10 text-destructive border-destructive/20",
  AUTO_APPROVE: "bg-success/10 text-success border-success/20",
  REVIEW_REQUIRED: "bg-warning/15 text-warning-foreground border-warning/30",
  REJECTED: "bg-destructive/10 text-destructive border-destructive/20",
};

export function StatusBadge({ value }: { value?: string | null }) {
  if (!value) return <span className="text-muted-foreground text-xs">—</span>;
  const key = String(value).toUpperCase().replace(/\s+/g, "_");
  const cls = STATUS_STYLES[key] || "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        cls
      )}
    >
      {String(value).replace(/_/g, " ")}
    </span>
  );
}
