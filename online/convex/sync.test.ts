// The daily member sync: adds new 1BB members, removes only members it added, and holds removals on a bad list.
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";
import { safeToRemove } from "./sync";

const modules = import.meta.glob("./**/*.ts");
const list = (n: number, extra: string[] = []) => [...Array.from({ length: n }, (_, i) => `m${i}@x.com`), ...extra];

test("adds, tags and removes only synced members", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(internal.members.add, { emails: ["guest@x.com", "m0@x.com"] }); // added by hand
  expect(await t.mutation(internal.sync.apply, { emails: list(10, ["NEW@X.com"]) })).toEqual({ listSize: 11, added: 10, tagged: 1, removed: 0, held: 0 });
  // m9 leaves 1BB; the guest was never synced, so stays.
  expect(await t.mutation(internal.sync.apply, { emails: list(9, ["new@x.com"]) })).toMatchObject({ removed: 1, held: 0 });
  const emails = (await t.run((ctx) => ctx.db.query("members").collect())).map((r) => r.email).sort();
  expect(emails).toContain("guest@x.com");
  expect(emails).toContain("new@x.com");
  expect(emails).not.toContain("m9@x.com");
});

test("a broken list removes nobody", async () => {
  const t = convexTest(schema, modules);
  await t.mutation(internal.sync.apply, { emails: list(30) });
  expect(await t.mutation(internal.sync.apply, { emails: [] })).toMatchObject({ removed: 0, held: 30 });
  expect(await t.mutation(internal.sync.apply, { emails: list(10) })).toMatchObject({ removed: 0, held: 20 });
  expect((await t.run((ctx) => ctx.db.query("members").collect())).length).toBe(30);
});

test("the removal guard", () => {
  expect(safeToRemove(4, 4, 1)).toBe(false); // list too small to trust
  expect(safeToRemove(60, 60, 3)).toBe(true);
  expect(safeToRemove(60, 60, 12)).toBe(true); // 20%
  expect(safeToRemove(60, 60, 13)).toBe(false);
});
