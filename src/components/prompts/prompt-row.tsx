"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { setPromptActive, updatePromptText } from "@/app/dashboard/prompt-actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LANGUAGE_LABELS } from "@/lib/prompts/types";
import type { Prompt } from "@/lib/supabase/types";

export function PromptRow({ prompt }: { prompt: Prompt }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updatePromptText, undefined);

  useEffect(() => {
    if (state?.ok) setEditing(false);
  }, [state]);

  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start">
      <div className="flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default">{LANGUAGE_LABELS[prompt.language]}</Badge>
          {prompt.active ? <Badge variant="good">Active</Badge> : <Badge variant="muted">Draft</Badge>}
        </div>
        {editing ? (
          <form action={action} className="space-y-2">
            <input type="hidden" name="promptId" value={prompt.id} />
            <input type="hidden" name="brandId" value={prompt.brand_id} />
            <Textarea
              name="text"
              defaultValue={prompt.text}
              maxLength={300}
              aria-label="Prompt text"
              autoFocus
            />
            {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Saving…" : "Save"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-navy">{prompt.text}</p>
        )}
      </div>
      {!editing && (
        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setEditing(true)}
            aria-label={`Edit prompt: ${prompt.text}`}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <form action={setPromptActive}>
            <input type="hidden" name="promptId" value={prompt.id} />
            <input type="hidden" name="brandId" value={prompt.brand_id} />
            <input type="hidden" name="active" value={String(!prompt.active)} />
            <Button size="sm" variant={prompt.active ? "outline" : "accent"} type="submit">
              {prompt.active ? "Deactivate" : "Activate"}
            </Button>
          </form>
        </div>
      )}
    </li>
  );
}
