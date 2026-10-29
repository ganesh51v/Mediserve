import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { supabase, createSupabaseClient } from "../../src/lib/supabase";
import { supabase as dbSupabase } from "../../src/lib/db";

describe("Supabase Integration Tests", () => {
  test("supabase client is instantiated and exported", () => {
    assert.ok(supabase, "supabase client should be defined");
    assert.equal(typeof supabase.from, "function");
    assert.equal(typeof supabase.auth, "object");
  });

  test("createSupabaseClient returns a configured client with environment URL", () => {
    const client = createSupabaseClient();
    assert.ok(client);
    assert.equal(typeof client.from, "function");
    // Verify client points to configured URL
    assert.ok((client as any).supabaseUrl.includes("oosflbszoccmrwqfdyjo.supabase.co"));
  });

  test("db.ts re-exports the integrated supabase client", () => {
    assert.ok(dbSupabase);
    assert.equal(typeof dbSupabase.from, "function");
  });

  test("supabase query builder builds valid query promises without error", async () => {
    const query = supabase.from("patients").select("*").limit(1);
    assert.ok(query);
    assert.equal(typeof query.then, "function");
  });
});
