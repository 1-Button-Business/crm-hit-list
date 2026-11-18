/// <reference types="vite/client" />
// A member's own site (OWNER_EMAIL set): one owner, nobody else, and nobody can claim it first without the setup code.
import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import { ownerProfile } from "./auth";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
afterEach(() => vi.unstubAllEnvs());

function ownMode() {
  vi.stubEnv("OWNER_EMAIL", "Owner@Example.com");
  vi.stubEnv("OWNER_SETUP_CODE", "red-fox-42");
}

describe("own site sign-in", () => {
  test("only the owner's email, and making the login needs the setup code", () => {
    ownMode();
    expect(() => ownerProfile({ email: "someone@else.com", flow: "signIn" })).toThrow();
    expect(() => ownerProfile({ email: "someone@else.com", flow: "signUp", setupCode: "red-fox-42" })).toThrow();
    expect(() => ownerProfile({ email: "owner@example.com", flow: "signUp" })).toThrow();
    expect(() => ownerProfile({ email: "owner@example.com", flow: "signUp", setupCode: "red-fox-41" })).toThrow();
    expect(ownerProfile({ email: " OWNER@example.com", flow: "signUp", setupCode: "red-fox-42" })).toEqual({ email: "owner@example.com" });
    expect(ownerProfile({ email: "owner@example.com", flow: "signIn" })).toEqual({ email: "owner@example.com" });
  });

  test("no setup code set means nobody can make a login", () => {
    vi.stubEnv("OWNER_EMAIL", "owner@example.com");
    vi.stubEnv("OWNER_SETUP_CODE", "");
    expect(() => ownerProfile({ email: "owner@example.com", flow: "signUp", setupCode: "" })).toThrow();
  });
});

describe("own site data rules", () => {
  test("the owner gets in, everyone else is refused, the member list is ignored", async () => {
    ownMode();
    const t = convexTest(schema, modules);
    const owner = await t.run((ctx) => ctx.db.insert("users", { email: "owner@example.com" }));
    const other = await t.run((ctx) => ctx.db.insert("users", { email: "b@example.com" }));
    await t.mutation(internal.members.add, { emails: ["b@example.com"] });
    const asOwner = t.withIdentity({ subject: `${owner}|s` });
    const asOther = t.withIdentity({ subject: `${other}|s` });

    expect(await t.query(api.crm.site, {})).toEqual({ ownSite: true });
    await expect(t.query(api.crm.db, {})).rejects.toThrow("Sign in first.");
    await expect(asOther.query(api.crm.db, {})).rejects.toThrow();
    await expect(asOther.mutation(api.crm.addPerson, { person: { name: "X" } })).rejects.toThrow();
    await asOwner.mutation(api.crm.addPerson, { person: { name: "Test Person" } });
    expect((await asOwner.query(api.crm.db, {})).people.map((p) => p.name)).toEqual(["Test Person"]);
  });

  test("the 1BB site is not an own site", async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.crm.site, {})).toEqual({ ownSite: false });
  });

  test("resetting the login removes the password and sessions, and keeps the list", async () => {
    ownMode();
    const t = convexTest(schema, modules);
    const owner = await t.run(async (ctx) => {
      const u = await ctx.db.insert("users", { email: "owner@example.com" });
      await ctx.db.insert("authAccounts", { userId: u, provider: "password", providerAccountId: "owner@example.com", secret: "x" });
      const s = await ctx.db.insert("authSessions", { userId: u, expirationTime: Date.now() + 1e6 });
      await ctx.db.insert("authRefreshTokens", { sessionId: s, expirationTime: Date.now() + 1e6 });
      return u;
    });
    await t.withIdentity({ subject: `${owner}|s` }).mutation(api.crm.addPerson, { person: { name: "Kept" } });
    expect(await t.mutation(internal.owner.resetLogin, {})).toEqual({ removed: 1 });
    const left = await t.run(async (ctx) => ({
      accounts: (await ctx.db.query("authAccounts").collect()).length,
      sessions: (await ctx.db.query("authSessions").collect()).length,
      tokens: (await ctx.db.query("authRefreshTokens").collect()).length,
      people: (await ctx.db.query("people").collect()).length,
    }));
    expect(left).toEqual({ accounts: 0, sessions: 0, tokens: 0, people: 1 });
  });
});
