import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Welcome back</h1>
      <p className="mb-6 text-sm text-navy-400">Log in to see how AI answers talk about your brand.</p>
      {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <AuthForm mode="login" next={safeNext(next)} />
    </>
  );
}
