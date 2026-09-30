import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Get your free AI-readiness score</h1>
      <p className="mb-6 text-sm text-navy-400">Create an account, add your website, and see your score in under a minute.</p>
      <AuthForm mode="signup" next="/onboarding" />
    </>
  );
}
