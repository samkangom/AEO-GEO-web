import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BrandForm } from "@/components/brand-form";
import { Logo } from "@/components/logo";
import { listBrands } from "@/lib/brands";

export const metadata: Metadata = { title: "Add your first brand" };
// The create-brand action runs the audit inline.
export const maxDuration = 60;

export default async function OnboardingPage() {
  const brands = await listBrands();
  if (brands.length > 0) redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
      <Logo href="/dashboard" />
      <div className="w-full max-w-md rounded-lg border border-navy-100 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold">Add your first brand</h1>
        <p className="mb-6 text-sm text-navy-400">
          Just your brand name and website. We&apos;ll check how ready your site is for AI answer engines like
          ChatGPT and Claude.
        </p>
        <BrandForm />
      </div>
    </div>
  );
}
