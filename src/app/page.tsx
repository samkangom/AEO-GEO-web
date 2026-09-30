import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

// Placeholder home — the full landing page and pricing arrive in Sprint 7.
export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="container flex h-16 items-center justify-between">
        <Logo />
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button variant="accent" asChild>
            <Link href="/signup">Start free audit</Link>
          </Button>
        </nav>
      </header>
      <main className="container flex flex-1 flex-col items-start justify-center gap-6 py-20">
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Is ChatGPT recommending your brand — or your competitor?
        </h1>
        <p className="max-w-2xl text-lg text-navy-400">{siteConfig.tagline}</p>
        <Button variant="accent" size="lg" asChild>
          <Link href="/signup">Get your free AI-readiness score</Link>
        </Button>
      </main>
    </div>
  );
}
