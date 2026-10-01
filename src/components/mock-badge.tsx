import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

/** Marks simulated (MOCK_AI_RESPONSES) data wherever it's shown. */
export function MockBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900",
        className,
      )}
      title="Simulated answers from mock mode — not real AI results"
    >
      <FlaskConical className="h-3 w-3" aria-hidden /> Mock
    </span>
  );
}

export function MockModeBanner() {
  return (
    <div className="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900" role="status">
      <FlaskConical className="mr-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden />
      Mock AI mode is on: new AI answers are simulated, not real results. Anything simulated is labelled
      “Mock”.
    </div>
  );
}
