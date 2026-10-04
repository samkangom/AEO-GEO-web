import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { listBrands } from "@/lib/brands";
import { getUser } from "@/lib/supabase/server";
import { MockModeBanner } from "@/components/mock-badge";
import { isMockMode } from "@/lib/mock-mode";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, brands] = await Promise.all([getUser(), listBrands()]);

  return (
    <div className="min-h-screen">
      {isMockMode() && <MockModeBanner />}
      <div className="flex min-h-screen flex-col md:flex-row">
        <DashboardSidebar brands={brands.map(({ id, name }) => ({ id, name }))} email={user?.email ?? null} />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
