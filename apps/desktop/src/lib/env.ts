import { z } from "zod";

// A path such as "/supabase" (dev proxy) resolves against the current origin.
const absoluteUrl = z.preprocess(
  (v) => (typeof v === "string" && v.startsWith("/") && typeof window !== "undefined" ? new URL(v, window.location.origin).toString().replace(/\/$/, "") : v),
  z.string().url(),
);

const envSchema = z.object({
  VITE_SUPABASE_URL: absoluteUrl,
  VITE_SUPABASE_ANON_KEY: z.string().min(20),
  VITE_API_URL: z.string().url().optional().or(z.literal("")),
});

export type AppEnv = z.infer<typeof envSchema>;

export function readEnv(source: Record<string, unknown> = import.meta.env): { ok: true; env: AppEnv } | { ok: false; error: string } {
  const parsed = envSchema.safeParse(source);
  if (parsed.success) return { ok: true, env: parsed.data };
  return {
    ok: false,
    error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
  };
}
