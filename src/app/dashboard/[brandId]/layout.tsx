import { ExternalLink } from "lucide-react";
import { BrandTabs } from "@/components/brand-tabs";
import { getBrandOr404 } from "@/lib/brands";
import { displayHost } from "@/lib/url";

export default async function BrandLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ brandId: string }>;
}) {
  const { brandId } = await params;
  const brand = await getBrandOr404(brandId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{brand.name}</h1>
        <a
          href={brand.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-navy-400 hover:text-accent-dark"
        >
          {displayHost(brand.url)} <ExternalLink className="h-3 w-3" />
        </a>
      </div>
      <BrandTabs brandId={brand.id} />
      {children}
    </div>
  );
}
