import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Copy, Check, ArrowDown, Inbox, ScanLine, ShieldCheck, GitBranch, UserCheck, BarChart3 } from "lucide-react";
import { ProtectedLayout } from "@/components/ProtectedLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/inbox-configuration")({
  component: InboxPage,
});

const INBOX = "apinvoicesdemo@gmail.com";

const STEPS = [
  { icon: Inbox, title: "Vendor Email", desc: "Vendors send invoices with PDF attachments." },
  { icon: ScanLine, title: "AI OCR Extraction", desc: "Structured fields extracted from PDFs." },
  { icon: ShieldCheck, title: "Validation Engine", desc: "Schema, balance and tolerance checks." },
  { icon: GitBranch, title: "Duplicate Prevention", desc: "Cross-reference against invoice registry." },
  { icon: UserCheck, title: "Auto Approval / Manual Review", desc: "Routed based on rules and confidence." },
  { icon: BarChart3, title: "Finance Operations Dashboard", desc: "Lifecycle tracking and reporting." },
];

function InboxPage() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(INBOX);
      setCopied(true);
      toast.success("Email copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <ProtectedLayout title="Inbox Configuration" subtitle="Configure your AI-powered invoice intake">
      <div className="grid lg:grid-cols-5 gap-6">
        <section className="lg:col-span-3 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">AP Intake Inbox</h2>
              <p className="text-sm text-muted-foreground">Forward vendor invoices to this email.</p>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/40 p-4 flex items-center justify-between gap-3">
            <code className="text-sm md:text-base font-medium text-foreground break-all">{INBOX}</code>
            <Button onClick={copy} size="sm" variant={copied ? "default" : "outline"}>
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          <div className="mt-6 rounded-lg border border-info/20 bg-info/5 p-4">
            <p className="text-sm text-foreground">
              Send vendor invoices with PDF attachments to this inbox for automated AI-powered processing.
              The pipeline extracts, validates, and routes each invoice without manual intervention.
            </p>
          </div>
        </section>

        <section className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">How it works</h2>
          <p className="text-sm text-muted-foreground mb-2">End-to-end automated AP pipeline.</p>
        </section>

        <section className="lg:col-span-5 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-base font-semibold text-foreground mb-5">Workflow Pipeline</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="relative rounded-lg border border-border bg-background p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-muted-foreground">0{i + 1}</span>
                        <h4 className="text-sm font-semibold text-foreground">{s.title}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                    </div>
                  </div>
                  {i < STEPS.length - 1 && (
                    <ArrowDown className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 rotate-[-90deg]" />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </ProtectedLayout>
  );
}
