import type { Metadata } from "next";
import { BrandSettingsForm } from "@/components/brand-settings-form";
import { DeleteBrandButton } from "@/components/delete-brand-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBrandOr404 } from "@/lib/brands";

export const metadata: Metadata = { title: "Brand settings" };

export default async function BrandSettingsPage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  const brand = await getBrandOr404(brandId);

  return (
    <div className="grid max-w-xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Brand details</CardTitle>
        </CardHeader>
        <CardContent>
          <BrandSettingsForm brand={brand} />
        </CardContent>
      </Card>
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle>Delete brand</CardTitle>
          <CardDescription>
            Removes this brand and all of its audits, prompts and monitor history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeleteBrandButton brandId={brand.id} brandName={brand.name} />
        </CardContent>
      </Card>
    </div>
  );
}
