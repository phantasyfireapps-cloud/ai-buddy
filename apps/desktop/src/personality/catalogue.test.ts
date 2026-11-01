// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
// @ts-expect-error plain JS build script
import { buildCatalogueSql } from "../../../../scripts/generate-catalogue-migration.mjs";

describe("catalogue migration", () => {
  it("is in sync with /presets (run scripts/generate-catalogue-migration.mjs)", () => {
    const file = readFileSync(join(__dirname, "../../../../supabase/migrations/20261101120100_catalogue_seed.sql"), "utf8");
    expect(file).toBe(buildCatalogueSql());
  });
});
