import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  Activity,
  Mail,
  ScanLine,
  FileSearch,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { fetchExecutionLog, type ExecutionLog } from "@/lib/api";

const STAGES = [
  { key: "EMAIL_RECEIVED", label: "Email Received", icon: Mail },
  { key: "OCR_PROCESSING", label: "OCR Processing", icon: ScanLine },
  { key: "OCR_COMPLETED", label: "OCR Completed", icon: FileSearch },
  { key: "AI_EXTRACTION", label: "AI Extraction", icon: Sparkles },
  { key: "VALIDATION_RUNNING", label: "Validation", icon: ShieldCheck },
  { key: "AUTO_APPROVED", label: "Auto Approved", icon: CheckCircle2 },
  { key: "PENDING_REVIEW", label: "Pending Review", icon: Clock },
] as const;

function stageIndex(stage?: string) {
  if (!stage) return -1;
  return STAGES.findIndex((s) => s.key === String(stage).toUpperCase());
}

function statusStyle(status?: string) {
  const s = String(status || "").toUpperCase();
  if (s === "RUNNING") return "bg-info/10 text-info border-info/20";
  if (s === "COMPLETED" || s === "SUCCESS") return "bg-success/10 text-success border-success/20";
  if (s === "FAILED" || s === "ERROR") return "bg-destructive/10 text-destructive border-destructive/20";
  if (s === "PENDING") return "bg-warning/15 text-warning-foreground border-warning/30";
  return "bg-muted text-muted-foreground border-border";
}

function formatTime(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function LiveExecutionPanel() {
  const { data, isLoading, isError, isFetching, dataUpdatedAt } = useQuery({
    queryKey: ["execution-log"],
    queryFn: fetchExecutionLog,
    refetchInterval: 5_000,
  });

  const logs: ExecutionLog[] = data || [];

  const sorted = useMemo(
    () =>
      [...logs].sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      }),
    [logs],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of STAGES) c[s.key] = 0;
    for (const l of logs) {
      const k = String(l.current_stage || "").toUpperCase();
      if (k in c) c[k]++;
    }
    return c;
  }, [logs]);

  const running = logs.filter((l) => String(l.workflow_status || "").toUpperCase() === "RUNNING").length;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Live Execution Tracking</h2>
            <p className="text-xs text-muted-foreground">
              {running} running · {logs.length} total executions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          Live · refreshes every 5s
          {dataUpdatedAt > 0 && (
            <span className="ml-1">· {new Date(dataUpdatedAt).toLocaleTimeString()}</span>
          )}
          {isFetching && <Loader2 className="ml-1 h-3 w-3 animate-spin" />}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-5 md:grid-cols-4 lg:grid-cols-7">
        {STAGES.map((s, i) => {
          const Icon = s.icon;
          const count = counts[s.key] || 0;
          const active = count > 0;
          return (
            <div
              key={s.key}
              className={cn(
                "flex flex-col items-start gap-2 rounded-lg border p-3 transition-colors",
                active ? "border-primary/30 bg-primary/5" : "border-border bg-card",
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Stage {i + 1}
                </div>
                <div className="text-xs font-semibold text-foreground">{s.label}</div>
              </div>
              <div className="text-lg font-semibold tabular-nums text-foreground">{count}</div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading executions…
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center py-12 text-sm text-destructive">
            <AlertCircle className="mr-2 h-4 w-4" /> Failed to load execution log
          </div>
        ) : sorted.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No executions yet</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Execution ID</TableHead>
                <TableHead>Sender Email</TableHead>
                <TableHead>Current Stage</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((l, idx) => {
                const idx2 = stageIndex(l.current_stage);
                const pct = idx2 >= 0 ? Math.round(((idx2 + 1) / STAGES.length) * 100) : 0;
                const stageLabel = STAGES[idx2]?.label || l.current_stage || "—";
                return (
                  <TableRow key={`${l.execution_id}-${idx}`}>
                    <TableCell className="font-mono text-xs">{l.execution_id || "—"}</TableCell>
                    <TableCell className="text-sm">{l.sender_email || "—"}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-foreground">
                        {stageLabel}
                      </span>
                    </TableCell>
                    <TableCell className="w-[180px]">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-9 text-right text-[11px] tabular-nums text-muted-foreground">
                          {pct}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide",
                          statusStyle(l.workflow_status),
                        )}
                      >
                        {l.workflow_status || "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground">
                      {formatTime(l.created_at)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </Card>
  );
}
