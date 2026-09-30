"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import { generatePrompts } from "@/app/dashboard/prompt-actions";
import { Button } from "@/components/ui/button";

export function GeneratePromptsButton({
  brandId,
  label,
  disabled,
}: {
  brandId: string;
  label: string;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState(generatePrompts, undefined);
  return (
    <form action={action} className="flex flex-col items-start gap-2 sm:items-end">
      <input type="hidden" name="brandId" value={brandId} />
      <Button type="submit" variant="accent" disabled={pending || disabled}>
        <Sparkles className="h-4 w-4" />
        {pending ? "Writing prompts…" : label}
      </Button>
      {state?.error && <p className="max-w-sm text-sm text-red-600 sm:text-right">{state.error}</p>}
    </form>
  );
}
