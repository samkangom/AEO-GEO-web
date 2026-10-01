import type { Metadata } from "next";
import { setAllPromptsActive } from "@/app/dashboard/prompt-actions";
import { GeneratePromptsButton } from "@/components/prompts/generate-button";
import { PromptRow } from "@/components/prompts/prompt-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getBrandOr404 } from "@/lib/brands";
import { promptGenerationAvailable } from "@/lib/engines/claude-tasks";
import { listPrompts } from "@/lib/prompts/store";
import { INTENTS, INTENT_LABELS } from "@/lib/prompts/types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Prompts" };
// Prompt generation (a Claude call) runs on this route.
export const maxDuration = 120;

const INTENT_HELP: Record<(typeof INTENTS)[number], string> = {
  shortlist: "Buyers asking for the best options",
  comparison: "Buyers comparing options in your category",
  pricing: "Buyers asking about cost and budget",
  local: "Buyers looking in a specific city",
};

export default async function PromptsPage({ params }: { params: Promise<{ brandId: string }> }) {
  const { brandId } = await params;
  const brand = await getBrandOr404(brandId);
  const supabase = await createClient();
  const prompts = await listPrompts(supabase, brand.id);
  const claudeConfigured = promptGenerationAvailable();
  const activeCount = prompts.filter((p) => p.active).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Prompts</CardTitle>
            <CardDescription className="max-w-2xl">
              The questions we ask AI engines to see whether they recommend {brand.name}. They&apos;re written
              the way your buyers type — in English and Hindi/Hinglish — and never include your brand name.
              Edit any prompt, then activate the ones you want monitored.
            </CardDescription>
            {prompts.length > 0 && (
              <p className="text-sm text-navy-400">
                {activeCount} of {prompts.length} active
              </p>
            )}
          </div>
          <GeneratePromptsButton
            brandId={brand.id}
            label={prompts.length ? "Regenerate drafts" : "Generate prompts"}
            disabled={!claudeConfigured}
          />
        </CardHeader>
        {!claudeConfigured && (
          <CardContent>
            <p className="rounded-md bg-navy-50 p-3 text-sm text-navy-600">
              Prompt generation is not configured: it uses Claude, and ANTHROPIC_API_KEY isn&apos;t set.
            </p>
          </CardContent>
        )}
        {prompts.length > 0 && (
          <CardContent className="flex flex-wrap gap-2 pt-0">
            <form action={setAllPromptsActive}>
              <input type="hidden" name="brandId" value={brand.id} />
              <input type="hidden" name="active" value="true" />
              <Button size="sm" variant="outline" type="submit" disabled={activeCount === prompts.length}>
                Activate all
              </Button>
            </form>
            <form action={setAllPromptsActive}>
              <input type="hidden" name="brandId" value={brand.id} />
              <input type="hidden" name="active" value="false" />
              <Button size="sm" variant="ghost" type="submit" disabled={activeCount === 0}>
                Deactivate all
              </Button>
            </form>
            <p className="basis-full text-xs text-navy-300">
              “Regenerate drafts” replaces draft prompts only — active prompts are kept.
            </p>
          </CardContent>
        )}
      </Card>

      {prompts.length > 0 &&
        INTENTS.map((intent) => {
          const group = prompts.filter((p) => p.intent === intent);
          if (!group.length) return null;
          return (
            <Card key={intent}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{INTENT_LABELS[intent]}</CardTitle>
                <CardDescription>{INTENT_HELP[intent]}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-navy-50">
                  {group.map((p) => (
                    <PromptRow key={p.id} prompt={p} />
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
    </div>
  );
}
