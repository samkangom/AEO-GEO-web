"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { runAudit } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";

export function RunAuditButton({
  brandId,
  label = "Run audit again",
  onDark = false,
}: {
  brandId: string;
  label?: string;
  /** Placed on the navy audit header: stretch to the column and use a readable error colour. */
  onDark?: boolean;
}) {
  const [state, action, pending] = useActionState(runAudit, undefined);

  return (
    <form action={action} className={onDark ? "flex flex-col gap-2" : "flex flex-col items-end gap-2"}>
      <input type="hidden" name="brandId" value={brandId} />
      <Button type="submit" variant="accent" disabled={pending}>
        <RefreshCw className={pending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        {pending ? "Auditing… (up to a minute)" : label}
      </Button>
      {state?.error && (
        <p className={onDark ? "text-sm text-red-200" : "max-w-sm text-right text-sm text-red-600"}>
          {state.error}
        </p>
      )}
    </form>
  );
}
