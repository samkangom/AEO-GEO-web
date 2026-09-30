"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export function BrandSwitcher({ brands }: { brands: { id: string; name: string }[] }) {
  const params = useParams<{ brandId?: string }>();
  const current = brands.find((b) => b.id === params.brandId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="max-w-[16rem] justify-between">
          <span className="truncate">{current?.name ?? "Select a brand"}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-navy-300" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Your brands</DropdownMenuLabel>
        {brands.map((b) => (
          <DropdownMenuItem key={b.id} asChild>
            <Link href={`/dashboard/${b.id}`}>
              <Check className={b.id === current?.id ? "h-4 w-4 text-accent" : "h-4 w-4 opacity-0"} />
              <span className="truncate">{b.name}</span>
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/brands/new">
            <Plus className="h-4 w-4" /> Add brand
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
