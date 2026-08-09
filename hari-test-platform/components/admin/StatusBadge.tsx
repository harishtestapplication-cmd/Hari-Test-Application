import { Badge } from "@/components/ui/badge";

const CONFIG: Record<string, { label: string; className: string }> = {
  submitted: { label: "Submitted", className: "bg-green-600" },
  time_expired: { label: "Time Expired", className: "bg-amber-500" },
  test_expired: { label: "Test Expired", className: "bg-amber-500" },
  in_progress: { label: "In Progress", className: "bg-blue-500" },
};

export function AttemptStatusBadge({ status }: { status: string }) {
  const cfg = CONFIG[status] ?? { label: status, className: "bg-muted" };
  return <Badge className={cfg.className}>{cfg.label}</Badge>;
}