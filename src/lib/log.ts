/**
 * Structured server logging: one JSON object per line, so logs are searchable
 * in Vercel (filter by `event`, `brandId`, etc.). Never log secrets or raw
 * API keys; log IDs, not personal data.
 */
type Context = Record<string, unknown>;

function serialiseError(err: unknown) {
  if (err instanceof Error) {
    const { code, cause } = err as Error & { code?: unknown; cause?: unknown };
    return {
      name: err.name,
      message: err.message,
      code,
      cause: cause instanceof Error ? cause.message : cause,
      stack: err.stack,
    };
  }
  return { message: String(err) };
}

function write(level: "info" | "warn" | "error", event: string, ctx: Context) {
  const line = JSON.stringify({ level, event, time: new Date().toISOString(), ...ctx });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  info: (event: string, ctx: Context = {}) => write("info", event, ctx),
  warn: (event: string, ctx: Context = {}) => write("warn", event, ctx),
  error: (event: string, err: unknown, ctx: Context = {}) =>
    write("error", event, { ...ctx, error: serialiseError(err) }),
};
