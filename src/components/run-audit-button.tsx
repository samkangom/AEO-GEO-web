"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { runAudit } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";

export function RunAuditButton({ brandId, label = "Run audit again" }: { brandId: string; label?: string }) {
  const [state, action, pending] = useActionState(runAudit, undefined);

  return (
    <form action={action} className="flex flex-col items-end gap-2">
      <input type="hidden" name="brandId" value={brandId} />
      <Button type="submit" variant="accent" disabled={pending}>
        <RefreshCw className={pending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        {pending ? "Auditing… (about 20 seconds)" : label}
      </Button>
      {state?.error && <p className="max-w-sm text-right text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
