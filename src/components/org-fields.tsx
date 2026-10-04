import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ORG_KIND_LABELS, ORG_KINDS, type OrgKind } from "@/lib/org-kind";

/** "What kind of website" and "other names": shared by the add-brand and settings forms. */
export function OrgFields({
  kind = "business",
  aliases = [],
  disabled,
}: {
  kind?: OrgKind;
  aliases?: string[];
  disabled?: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="kind">Type of organisation</Label>
        <select
          id="kind"
          name="kind"
          defaultValue={kind}
          disabled={disabled}
          aria-describedby="kind-hint"
          className="flex h-10 w-full rounded-md border border-navy-100 bg-white px-3 text-sm text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {ORG_KINDS.map((k) => (
            <option key={k} value={k}>
              {ORG_KIND_LABELS[k]}
            </option>
          ))}
        </select>
        <p id="kind-hint" className="text-xs text-navy-400">
          Sets which checks apply (public pricing only counts for businesses) and who the AI questions are
          written for.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="aliases">
          Other names <span className="font-normal text-navy-300">(optional)</span>
        </Label>
        <Input
          id="aliases"
          name="aliases"
          defaultValue={aliases.join(", ")}
          placeholder="e.g. BJP, Bharatiya Janata Party"
          disabled={disabled}
          aria-describedby="aliases-hint"
        />
        <p id="aliases-hint" className="text-xs text-navy-400">
          Comma-separated. AI answers using any of these count as a mention. Short all-caps names like
          &ldquo;BJP&rdquo; must match exactly, so &ldquo;INC&rdquo; won&apos;t match &ldquo;Acme Inc.&rdquo;
        </p>
      </div>
    </>
  );
}
