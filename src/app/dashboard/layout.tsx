import { BrandSwitcher } from "@/components/brand-switcher";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { listBrands } from "@/lib/brands";
import { getUser } from "@/lib/supabase/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, brands] = await Promise.all([getUser(), listBrands()]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-navy-100 bg-white">
        <div className="container flex h-16 items-center gap-2 sm:gap-4">
          <Logo href="/dashboard" compact />
          <div className="hidden h-6 w-px bg-navy-100 sm:block" />
          <BrandSwitcher brands={brands.map(({ id, name }) => ({ id, name }))} />
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <span className="hidden text-sm text-navy-400 sm:inline">{user?.email}</span>
            <form action="/auth/signout" method="post">
              <Button variant="ghost" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}
