"use client";

import { useActionState } from "react";
import { updateBrand } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Brand } from "@/lib/supabase/types";

export function BrandSettingsForm({ brand }: { brand: Brand }) {
  const [state, action, pending] = useActionState(updateBrand, undefined);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="brandId" value={brand.id} />
      <div className="space-y-2">
        <Label htmlFor="name">Brand name</Label>
        <Input id="name" name="name" defaultValue={brand.name} required maxLength={120} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="url">Website</Label>
        <Input id="url" name="url" defaultValue={brand.url} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="industry">
          Industry <span className="font-normal text-navy-300">(optional — helps generate better prompts)</span>
        </Label>
        <Input
          id="industry"
          name="industry"
          defaultValue={brand.industry ?? ""}
          placeholder="e.g. GST billing software, industrial pumps"
          maxLength={80}
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-accent-dark">Saved.</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
