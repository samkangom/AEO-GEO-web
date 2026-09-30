// Hand-maintained to match supabase/migrations. Regenerate with
// `npx supabase gen types typescript --linked > src/lib/supabase/types.ts`
// once a project is linked.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Required extends keyof Row, Optional extends keyof Row> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Pick<Row, Optional>>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Profile = { id: string; company_name: string | null; created_at: string };
export type Brand = {
  id: string;
  user_id: string;
  name: string;
  url: string;
  industry: string | null;
  created_at: string;
};
export type Audit = {
  id: string;
  brand_id: string;
  overall_score: number;
  breakdown: Json;
  created_at: string;
};
export type Prompt = {
  id: string;
  brand_id: string;
  text: string;
  language: "en" | "hi" | "hinglish";
  intent: "shortlist" | "comparison" | "pricing" | "local";
  active: boolean;
  created_at: string;
};
export type MonitorRun = {
  id: string;
  brand_id: string;
  status: "running" | "completed" | "failed";
  started_at: string;
  finished_at: string | null;
};
export type EngineResult = {
  id: string;
  run_id: string;
  prompt_id: string;
  engine: "openai" | "anthropic" | "gemini" | "perplexity";
  mentioned: boolean | null;
  cited: boolean | null;
  position: number | null;
  sentiment: "positive" | "neutral" | "negative" | null;
  raw_response: string | null;
  model_version: string | null;
  web_search_used: boolean | null;
  sampled_at: string;
  /** Set when the engine call failed; `mentioned` is then null. */
  error: string | null;
  /** URLs the answer cited. */
  citations: string[];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<Profile, "id", "company_name" | "created_at">;
      brands: Table<Brand, "user_id" | "name" | "url", "id" | "industry" | "created_at">;
      audits: Table<Audit, "brand_id" | "overall_score" | "breakdown", "id" | "created_at">;
      prompts: Table<Prompt, "brand_id" | "text" | "language" | "intent", "id" | "active" | "created_at">;
      monitor_runs: Table<MonitorRun, "brand_id", "id" | "status" | "started_at" | "finished_at">;
      engine_results: Table<
        EngineResult,
        "run_id" | "prompt_id" | "engine",
        Exclude<keyof EngineResult, "run_id" | "prompt_id" | "engine">
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      owns_brand: { Args: { p_brand_id: string }; Returns: boolean };
      owns_run: { Args: { p_run_id: string }; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
