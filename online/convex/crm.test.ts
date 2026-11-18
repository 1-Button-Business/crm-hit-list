/// <reference types="vite/client" />
// The rules that keep one member's list away from everyone else.
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import { MAX_PEOPLE } from "./crm";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function setup() {
  const t = convexTest(schema, modules);
  const make = async (email: string) => {
    const id = await t.run((ctx) => ctx.db.insert("users", { email }));
    return { id, as: t.withIdentity({ subject: `${id}|session` }) };
  };
  const a = await make("a@example.com"), b = await make("b@example.com"), stranger = await make("nobody@example.com");
  await t.mutation(internal.members.add, { emails: ["A@Example.com", "b@example.com", "not-an-email"] });
  return { t, a, b, stranger };
}

describe("who gets in", () => {
  test("signed out and non-members are refused", async () => {
    const { t, stranger } = await setup();
    await expect(t.query(api.crm.db, {})).rejects.toThrow("Sign in first.");
    await expect(stranger.as.query(api.crm.db, {})).rejects.toThrow("This is for 1BB members.");
    await expect(stranger.as.mutation(api.crm.addPerson, { person: { name: "X" } })).rejects.toThrow("This is for 1BB members.");
    expect(await stranger.as.query(api.crm.me, {})).toMatchObject({ signedIn: true, member: false, flavor: "" });
    expect(await t.query(api.crm.me, {})).toEqual({ signedIn: false });
  });

  test("the member list ignores case and bad rows", async () => {
    const { t, a } = await setup();
    expect(await t.query(internal.members.count, {})).toBe(2);
    expect(await a.as.query(api.crm.me, {})).toMatchObject({ member: true });
  });
});

describe("one member can never touch another member's list", () => {
  test("reads and writes stay inside your own account", async () => {
    const { a, b } = await setup();
    const jane = await a.as.mutation(api.crm.addPerson, { person: { name: "  Jane Doe ", email: "j@x.com" } });
    expect(jane.name).toBe("Jane Doe");
    expect((await a.as.query(api.crm.db, {})).people).toHaveLength(1);
    expect((await b.as.query(api.crm.db, {})).people).toHaveLength(0);

    const no = "That person is not in your CRM.";
    await expect(b.as.mutation(api.crm.updatePerson, { id: jane.id, changes: { name: "Hacked" } })).rejects.toThrow(no);
    await expect(b.as.mutation(api.crm.removePerson, { id: jane.id })).rejects.toThrow(no);
    await expect(b.as.mutation(api.crm.addTouch, { touch: { personId: jane.id, kind: "call", body: "x" } })).rejects.toThrow(no);
    expect(await b.as.mutation(api.crm.importTouches, { rows: [{ personId: jane.id, kind: "call", body: "x" }] })).toEqual({ added: 0, skipped: 1 });

    const bob = await b.as.mutation(api.crm.addPerson, { person: { name: "Bob", referredById: jane.id } });
    expect(bob.referredById).toBe("");

    const touch = await a.as.mutation(api.crm.addTouch, { touch: { personId: jane.id, kind: "call", body: "Great chat", followUpOn: "2026-12-01" } });
    await expect(b.as.mutation(api.crm.removeTouch, { id: (touch as { id: string }).id })).rejects.toThrow("already gone");
    const mine = await a.as.query(api.crm.db, {});
    expect(mine.touches).toHaveLength(1);
    expect(mine.people[0]!.name).toBe("Jane Doe");
    expect(mine.people[0]!.followUpOn).toBe("2026-12-01");
  });

  test("deleting my account erases my rows and nobody else's", async () => {
    const { t, a, b } = await setup();
    const jane = await a.as.mutation(api.crm.addPerson, { person: { name: "Jane" } });
    await a.as.mutation(api.crm.addTouch, { touch: { personId: jane.id, kind: "note", body: "n" } });
    await a.as.mutation(api.crm.setFlavor, { flavor: "hitlist" });
    await b.as.mutation(api.crm.addPerson, { person: { name: "Bob" } });
    await a.as.mutation(api.crm.deleteAccount, {});
    const left = await t.run(async (ctx) => ({ people: await ctx.db.query("people").collect(), touches: await ctx.db.query("touches").collect(), settings: await ctx.db.query("crmSettings").collect(), user: await ctx.db.get(a.id) }));
    expect(left.people.map((p) => p.name)).toEqual(["Bob"]);
    expect(left.touches).toHaveLength(0);
    expect(left.settings).toHaveLength(0);
    expect(left.user).toBeNull();
  });
});

describe("the same rules as the copy people run themselves", () => {
  test("bad input gets a plain sentence and nothing is saved", async () => {
    const { a } = await setup();
    await expect(a.as.mutation(api.crm.addPerson, { person: { name: "   " } })).rejects.toThrow("A name is required");
    await expect(a.as.mutation(api.crm.addPerson, { person: { name: "Jane", birthday: "tomorrow" } })).rejects.toThrow("Write the date like 03-14 or 3/14");
    await expect(a.as.mutation(api.crm.updateSettings, { settings: { dailyGoal: 0 } })).rejects.toThrow("Pick a number from 1 to 500");
    const jane = await a.as.mutation(api.crm.addPerson, { person: { name: "Jane", birthday: "3/14" } });
    expect(jane.birthday).toBe("03-14");
    await expect(a.as.mutation(api.crm.addTouch, { touch: { personId: jane.id, kind: "note", body: "x".repeat(10_001) } })).rejects.toThrow("too long");
    expect((await a.as.query(api.crm.db, {})).touches).toHaveLength(0);
  });

  test("a connection can run twice without doubles, and imports skip known emails", async () => {
    const { a } = await setup();
    const jane = await a.as.mutation(api.crm.addPerson, { person: { name: "Jane", email: "j@x.com" } });
    const row = { personId: jane.id, kind: "meeting" as const, body: "Intro", at: "2026-11-05T15:00:00.000Z", source: "calendar", ref: "cal:a1" };
    expect(await a.as.mutation(api.crm.importTouches, { rows: [row, row] })).toEqual({ added: 1, skipped: 1 });
    expect(await a.as.mutation(api.crm.importTouches, { rows: [row] })).toEqual({ added: 0, skipped: 1 });
    expect(await a.as.mutation(api.crm.importPeople, { rows: [{ name: "Dup", email: "J@X.com" }, { name: "New", email: "n@x.com" }] })).toEqual({ added: 1, skipped: 1 });
  });

  test("picking a type sets its defaults, and switching moves people out of stages that no longer exist", async () => {
    const { a } = await setup();
    await a.as.mutation(api.crm.setFlavor, { flavor: "giftbook" });
    const first = await a.as.query(api.crm.db, {});
    expect(first.settings.quietDays).toBe(60);
    const p = await a.as.mutation(api.crm.addPerson, { person: { name: "Jane" } });
    await a.as.mutation(api.crm.updateSettings, { settings: { quietDays: 7 } });
    await a.as.mutation(api.crm.setFlavor, { flavor: "hitlist" });
    const after = await a.as.query(api.crm.db, {});
    expect(after.settings.quietDays).toBe(7);
    expect(after.people.find((x) => x.id === p.id)!.stage).not.toBe("");
    expect((await a.as.query(api.crm.me, {})).flavor).toBe("hitlist");
  });

  test("the list is capped", async () => {
    const { t, a } = await setup();
    await t.run(async (ctx) => {
      for (let i = 0; i < MAX_PEOPLE; i++) await ctx.db.insert("people", { userId: a.id, name: `P${i}`, email: "", phone: "", company: "", address: "", birthday: "", dates: [], stage: "new", tags: [], referredById: "", source: "", giftIdeas: "", about: "", fields: {}, followUpOn: "", followUpNote: "", createdAt: "2026-01-01T00:00:00.000Z" });
    });
    await expect(a.as.mutation(api.crm.addPerson, { person: { name: "One more" } })).rejects.toThrow("holds up to");
    expect(await a.as.mutation(api.crm.importPeople, { rows: [{ name: "Two more" }] })).toEqual({ added: 0, skipped: 1 });
  });
});
