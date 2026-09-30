"use client";

import { useActionState } from "react";
import { Play } from "lucide-react";
import { runMonitorNow } from "@/app/dashboard/monitor-actions";
import { Button } from "@/components/ui/button";

export function RunMonitorButton({
  brandId,
  disabled,
  estimate,
}: {
  brandId: string;
  disabled?: boolean;
  estimate: string;
}) {
  const [state, action, pending] = useActionState(runMonitorNow, undefined);
  return (
    <form action={action} className="flex flex-col items-start gap-2 sm:items-end">
      <input type="hidden" name="brandId" value={brandId} />
      <Button type="submit" variant="accent" disabled={pending || disabled}>
        <Play className="h-4 w-4" />
        {pending ? `Asking AI engines… (${estimate})` : "Run monitor now"}
      </Button>
      {state?.error && <p className="max-w-sm text-sm text-red-600 sm:text-right">{state.error}</p>}
    </form>
  );
}
