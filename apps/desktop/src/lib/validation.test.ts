import { describe, expect, it } from "vitest";
import { readEnv } from "./env";
import { buddyNameSchema, emailSchema, otpSchema, passwordSchema } from "./validation";

describe("validation", () => {
  it("normalises emails", () => {
    expect(emailSchema.parse("  Paul@Example.COM ")).toBe("paul@example.com");
    expect(emailSchema.safeParse("nope").success).toBe(false);
  });
  it("enforces password strength", () => {
    expect(passwordSchema.safeParse("short1A").success).toBe(false);
    expect(passwordSchema.safeParse("alllowercase1").success).toBe(false);
    expect(passwordSchema.safeParse("GoodPass123").success).toBe(true);
  });
  it("validates codes and names", () => {
    expect(otpSchema.safeParse("123456").success).toBe(true);
    expect(otpSchema.safeParse("12345a").success).toBe(false);
    expect(buddyNameSchema.safeParse("   ").success).toBe(false);
    expect(buddyNameSchema.parse("  Nick ")).toBe("Nick");
  });
  it("reports missing configuration", () => {
    const r = readEnv({});
    expect(r.ok).toBe(false);
    expect(readEnv({ VITE_SUPABASE_URL: "http://127.0.0.1:54321", VITE_SUPABASE_ANON_KEY: "x".repeat(30) }).ok).toBe(true);
  });
});

describe("env", () => {
  it("resolves a relative Supabase URL against the current origin", () => {
    const r = readEnv({ VITE_SUPABASE_URL: "/supabase", VITE_SUPABASE_ANON_KEY: "x".repeat(30) });
    expect(r.ok && r.env.VITE_SUPABASE_URL).toBe(`${window.location.origin}/supabase`);
  });
});
