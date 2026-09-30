"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/**
 * Catches unexpected errors in any page. `digest` matches the server log line,
 * so QA can include it in bug reports and engineers can find the stack trace.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="max-w-md text-navy-400">
        Please try again. If it keeps happening, send us the reference below.
      </p>
      {error.digest && (
        <code className="rounded bg-navy-50 px-2 py-1 text-xs text-navy-500">Ref: {error.digest}</code>
      )}
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
