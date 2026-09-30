"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.1 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4.1 9.6-9.8 0-.7-.1-1.2-.2-1.7H12z" />
    </svg>
  );
}

export function AuthForm({ mode, next }: { mode: Mode; next: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    const supabase = createClient();

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
            data: { company_name: String(form.get("company") ?? "").trim() },
          },
        });
        if (error) throw error;
        if (data.session) {
          router.push("/onboarding");
          router.refresh();
        } else {
          setInfo(`We've sent a confirmation link to ${email}. Click it to continue.`);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function onGoogle() {
    setError(null);
    const supabase = createClient();
    const target = mode === "signup" ? "/onboarding" : next;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(target)}` },
    });
    if (error) setError(error.message);
  }

  return (
    <div className="space-y-6">
      <Button type="button" variant="outline" className="w-full" onClick={onGoogle}>
        <GoogleIcon /> Continue with Google
      </Button>
      <div className="flex items-center gap-3 text-xs text-navy-300">
        <div className="h-px flex-1 bg-navy-100" /> or <div className="h-px flex-1 bg-navy-100" />
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="company">
              Company name <span className="font-normal text-navy-300">(optional)</span>
            </Label>
            <Input id="company" name="company" autoComplete="organization" />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {info && <p className="rounded-md bg-accent-light p-3 text-sm text-accent-dark">{info}</p>}
        <Button type="submit" variant="accent" className="w-full" disabled={pending}>
          {pending ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
        </Button>
      </form>
      <p className="text-center text-sm text-navy-400">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-accent-dark hover:underline">
              Log in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="font-medium text-accent-dark hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
