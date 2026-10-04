"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Copies the contact address; if the clipboard is blocked, says so and leaves the address on screen to copy by hand. */
export function CopyEmailButton({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 3000);
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button type="button" variant="accent" size="lg" onClick={copy}>
        {state === "copied" ? (
          <Check className="h-4 w-4" aria-hidden />
        ) : (
          <Copy className="h-4 w-4" aria-hidden />
        )}
        {state === "copied" ? "Email address copied" : "Copy email address"}
      </Button>
      <p role="status" aria-live="polite" className="text-sm text-accent-dark">
        {state === "failed" ? `Couldn't copy. The address is ${email}` : ""}
      </p>
    </div>
  );
}
