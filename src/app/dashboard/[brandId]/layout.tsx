import { ExternalLink } from "lucide-react";
import { getBrandOr404 } from "@/lib/brands";
import { ORG_KIND_SHORT } from "@/lib/org-kind";
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
        <h1 className="text-3xl font-bold">{brand.name}</h1>
        <p className="text-sm text-navy-400">
          <a
            href={brand.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-accent-dark"
          >
            {displayHost(brand.url)} <ExternalLink className="h-3 w-3" />
          </a>
          <span>
            {" · "}
            {brand.kind === "business" && brand.industry ? brand.industry : ORG_KIND_SHORT[brand.kind]}
          </span>
        </p>
      </div>
      {children}
    </div>
  );
}
