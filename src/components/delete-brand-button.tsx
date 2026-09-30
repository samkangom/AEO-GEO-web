"use client";

import { deleteBrand } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";

export function DeleteBrandButton({ brandId, brandName }: { brandId: string; brandName: string }) {
  return (
    <form
      action={deleteBrand}
      onSubmit={(e) => {
        if (
          !confirm(
            `Delete ${brandName} and all its audits, prompts and monitor history? This can't be undone.`,
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="brandId" value={brandId} />
      <Button type="submit" variant="destructive">
        Delete brand
      </Button>
    </form>
  );
}
