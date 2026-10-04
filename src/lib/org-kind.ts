import { INTENT_LABELS, type Intent } from "@/lib/prompts/types";

/**
 * What kind of organisation a tracked website belongs to. The product started
 * with B2B brands; the same audit and monitor work for any website, but a few
 * checks and the buyer-question wording only make sense for businesses.
 */
export const ORG_KINDS = ["business", "political_party", "nonprofit", "government", "other"] as const;
export type OrgKind = (typeof ORG_KINDS)[number];

export const ORG_KIND_LABELS: Record<OrgKind, string> = {
  business: "Business or brand",
  political_party: "Political party",
  nonprofit: "Nonprofit or NGO",
  government: "Government body",
  other: "Other organisation",
};

/** Lower-case noun for sentences: "not applicable for a political party". */
export const ORG_KIND_NOUN: Record<OrgKind, string> = {
  business: "business",
  political_party: "political party",
  nonprofit: "nonprofit",
  government: "government body",
  other: "organisation",
};

export function isOrgKind(v: unknown): v is OrgKind {
  return typeof v === "string" && (ORG_KINDS as readonly string[]).includes(v);
}

/** Public prices are a buying signal; for other organisations the check doesn't apply and costs no points. */
export function pricingApplies(kind: OrgKind) {
  return kind === "business";
}

/** Product/Service schema describes things on offer; parties and government bodies don't sell products. */
export function offeringsApply(kind: OrgKind) {
  return kind !== "political_party" && kind !== "government";
}

const AUDIENCE: Record<OrgKind, string> = {
  business: "Buyers",
  political_party: "People",
  nonprofit: "Donors and volunteers",
  government: "Citizens",
  other: "People",
};

/** Intent names as shown for this kind of organisation. The stored values never change. */
export function intentLabel(intent: Intent, kind: OrgKind = "business") {
  if (intent !== "pricing") return INTENT_LABELS[intent];
  switch (kind) {
    case "political_party":
      return "Funding & membership";
    case "nonprofit":
      return "Donations & fees";
    case "government":
      return "Fees & charges";
    default:
      return INTENT_LABELS.pricing;
  }
}

/** One-line description of each intent group on the Prompts page. */
export function intentHelp(intent: Intent, kind: OrgKind = "business") {
  const who = AUDIENCE[kind];
  switch (intent) {
    case "shortlist":
      return kind === "political_party"
        ? `${who} asking which parties have a position or plan on an issue`
        : `${who} asking for the best options`;
    case "comparison":
      return kind === "political_party"
        ? `${who} comparing parties' published positions`
        : `${who} comparing options in your category`;
    case "pricing":
      return kind === "political_party"
        ? `${who} asking about funding, donations and membership`
        : kind === "business"
          ? `${who} asking about cost and budget`
          : `${who} asking about costs, fees or donations`;
    case "local":
      return `${who} looking in a specific state or city`;
  }
}
