"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { addPrompt } from "@/app/dashboard/prompt-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { intentLabel, type OrgKind } from "@/lib/org-kind";
import { INTENTS } from "@/lib/prompts/types";

/** Lets the user track their own question alongside Claude's. Saved active; language detected. */
export function AddPromptForm({ brandId, kind }: { brandId: string; kind: OrgKind }) {
  const [state, action, pending] = useActionState(addPrompt, undefined);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  return (
    <Card>
      <CardContent className="pt-6">
        <form ref={form} action={action} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="brandId" value={brandId} />
          <div className="min-w-0 flex-[1_1_320px] space-y-2">
            <Label htmlFor="new-prompt">Add your own prompt</Label>
            <Input
              id="new-prompt"
              name="text"
              required
              maxLength={300}
              disabled={pending}
              aria-describedby="new-prompt-note new-prompt-status"
              placeholder={
                kind === "political_party"
                  ? "e.g. Which parties explain their education policy in Hindi?"
                  : "e.g. Which billing software do CA firms in Pune recommend?"
              }
            />
          </div>
          <div className="flex-[0_1_200px] space-y-2">
            <Label htmlFor="new-prompt-intent">Intent</Label>
            <select
              id="new-prompt-intent"
              name="intent"
              disabled={pending}
              className="flex h-10 w-full rounded-md border border-navy-100 bg-white px-3 text-sm text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {INTENTS.map((i) => (
                <option key={i} value={i}>
                  {intentLabel(i, kind)}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="accent" disabled={pending}>
            <Plus className="h-4 w-4" aria-hidden /> {pending ? "Adding…" : "Add prompt"}
          </Button>
          <p id="new-prompt-note" className="basis-full text-xs text-navy-400">
            Don&apos;t include your brand name — prompts that name you are left out. English, Hindi and
            Hinglish are detected automatically. New prompts start active.
          </p>
          <p id="new-prompt-status" role="status" className="basis-full text-sm">
            {state?.error ? (
              <span className="text-red-700">{state.error}</span>
            ) : state?.ok ? (
              <span className="text-accent-dark">Prompt added and active.</span>
            ) : null}
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
