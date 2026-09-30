"use client";

import { useActionState } from "react";
import { createBrand } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BrandForm() {
  const [state, action, pending] = useActionState(createBrand, undefined);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Brand name</Label>
        <Input
          id="name"
          name="name"
          placeholder="e.g. Acme Billing"
          required
          maxLength={120}
          disabled={pending}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="url">Website</Label>
        <Input id="url" name="url" placeholder="acmebilling.in" required inputMode="url" disabled={pending} />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" variant="accent" className="w-full" disabled={pending}>
        {pending ? "Checking your site… (about 20 seconds)" : "Add brand & run free audit"}
      </Button>
    </form>
  );
}
