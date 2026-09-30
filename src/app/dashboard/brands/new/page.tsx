import type { Metadata } from "next";
import { BrandForm } from "@/components/brand-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Add brand" };
export const maxDuration = 60;

export default function NewBrandPage() {
  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle>Add a brand</CardTitle>
        <CardDescription>Track another brand or client under this account.</CardDescription>
      </CardHeader>
      <CardContent>
        <BrandForm />
      </CardContent>
    </Card>
  );
}
