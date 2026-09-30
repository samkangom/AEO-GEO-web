import { Badge } from "@/components/ui/badge";

const MAP = {
  completed: { variant: "good", label: "Completed" },
  running: { variant: "default", label: "Running" },
  failed: { variant: "bad", label: "Failed" },
  interrupted: { variant: "warn", label: "Interrupted" },
} as const;

export function RunStatusBadge({ status }: { status: keyof typeof MAP }) {
  const m = MAP[status];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}
