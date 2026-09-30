import { redirect } from "next/navigation";
import { listBrands } from "@/lib/brands";

export default async function DashboardIndex() {
  const brands = await listBrands();
  redirect(brands.length ? `/dashboard/${brands[0].id}` : "/onboarding");
}
