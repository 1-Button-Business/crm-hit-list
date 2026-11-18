// The hosted CRM's back end. Same rules as the copy people run themselves
// (core/shared/schemas.ts), stored per member instead of in one file.
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { presets } from "../../crm.config.ts";
import { personInput, settingsInput, touchInput } from "../../shared/schemas.ts";
import { TOUCH_KINDS, emptyPerson } from "../../shared/types.ts";
import type { Db, Person, Touch } from "../../shared/types.ts";
import { personFields } from "./schema";

// ponytail: every screen loads the whole list at once, so the list is capped.
// Raise these only after moving the screens to paged loading.
export const MAX_PEOPLE = 2000;
export const MAX_TOUCHES = 5000;
const MAX_BODY = 10_000;

export type Flavor = keyof typeof presets;
export const isFlavor = (f: string): f is Flavor => f in presets;
export const fail = (message: string): never => { throw new ConvexError(message); };

/** Run a zod check and turn a failure into one plain sentence. */
export function check<T>(schema: { parse: (x: unknown) => T }, input: unknown): T {
  try { return schema.parse(input); }
  catch (e) {
    const issue = (e as { issues?: { message: string }[] }).issues?.[0];
    const plain = issue && !/^(Invalid|Too |Unrecognized)/.test(issue.message);
    return fail(plain ? issue.message : "Something in that box is not right. Check it and try again.");
  }
}

/** The signed-in member's id. Throws for anyone signed out or not on the member list. */
export async function member(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (!userId) return fail("Sign in first.");
  if (!(await isMember(ctx, userId))) return fail("This is for 1BB members.");
  return userId;
}

export async function isMember(ctx: QueryCtx | MutationCtx, userId: Id<"users">): Promise<boolean> {
  const user = await ctx.db.get(userId);
  if (!user) return false;
  if (process.env.TEST_LOGIN === "1" && user.isAnonymous) return true;
  const email = (user.email ?? "").trim().toLowerCase();
  if (!email) return false;
  const owner = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase();
  if (owner) return email === owner; // a member's own site: one owner, no member list
  return (await ctx.db.query("members").withIndex("by_email", (q) => q.eq("email", email)).first()) !== null;
}

export async function settingsRow(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  return await ctx.db.query("crmSettings").withIndex("by_user", (q) => q.eq("userId", userId)).first();
}

export async function flavorOf(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  const f = (await settingsRow(ctx, userId))?.flavor ?? "";
  return presets[isFlavor(f) ? f : "roster"];
}

/** One of this member's people, or a not-found error. Never someone else's row. */
export async function ownPerson(ctx: QueryCtx | MutationCtx, userId: Id<"users">, id: string) {
  const _id = ctx.db.normalizeId("people", id);
  const p = _id && (await ctx.db.get(_id));
  if (!p || p.userId !== userId) return fail("That person is not in your CRM.");
  return p;
}

export const mine = (ctx: QueryCtx | MutationCtx, userId: Id<"users">) => ({
  people: () => ctx.db.query("people").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
  touches: () => ctx.db.query("touches").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
});

/** Which kind of site this is. Shown before sign-in, so it says nothing about anyone. */
export const site = query({ args: {}, handler: async () => ({ ownSite: (process.env.OWNER_EMAIL ?? "").trim() !== "" }) });

/** Who is signed in, whether they are a member, and which CRM type they picked. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { signedIn: false as const };
    const user = await ctx.db.get(userId);
    const isM = await isMember(ctx, userId);
    return { signedIn: true as const, email: user?.email ?? "", name: user?.name ?? "", member: isM, flavor: isM ? ((await settingsRow(ctx, userId))?.flavor ?? "") : "" };
  },
});

export const db = query({ args: {}, handler: async (ctx): Promise<Db> => ops.db(ctx, await member(ctx)) });

const personArgs = v.object(Object.fromEntries(Object.entries(personFields).map(([k, val]) => [k, v.optional(val)])) as { [K in keyof typeof personFields]: ReturnType<typeof v.optional<(typeof personFields)[K]>> });
const touchArgs = v.object({
  personId: v.string(), kind: v.union(...TOUCH_KINDS.map((k) => v.literal(k))), body: v.string(),
  at: v.optional(v.string()), source: v.optional(v.string()), ref: v.optional(v.string()), followUpOn: v.optional(v.string()),
});

/** Tidy a person the way the local store does: unknown stage falls back, a referrer must be one of yours. */
async function clean(ctx: MutationCtx, userId: Id<"users">, input: ReturnType<typeof personInput.parse>) {
  const preset = await flavorOf(ctx, userId);
  if (input.stage !== undefined && !preset.stages.some((s) => s.id === input.stage)) input.stage = preset.firstStage;
  if (input.referredById) {
    const ref = ctx.db.normalizeId("people", input.referredById);
    const r = ref && (await ctx.db.get(ref));
    if (!r || r.userId !== userId) input.referredById = "";
  }
  return input;
}

/** Shared by addTouch and importTouches. Returns null for a double or an unknown person. */
async function saveTouch(ctx: MutationCtx, userId: Id<"users">, raw: unknown, existing: { personId: string; ref?: string }[]) {
  const data = check(touchInput, raw);
  if (data.body.length > MAX_BODY) fail("That is too long to save here. Paste a shorter summary.");
  const _id = ctx.db.normalizeId("people", data.personId);
  const p = _id && (await ctx.db.get(_id));
  if (!p || p.userId !== userId) return { person: null, touch: null };
  const twin = data.ref ? existing.find((t) => t.ref === data.ref && t.personId === p._id) : undefined;
  if (twin) return { person: p, touch: null };
  if (data.followUpOn !== undefined) await ctx.db.patch(p._id, { followUpOn: data.followUpOn, followUpNote: "" });
  const row = { personId: p._id, kind: data.kind, body: data.body, at: data.at ?? new Date().toISOString(), ...(data.source ? { source: data.source } : {}), ...(data.ref ? { ref: data.ref } : {}) };
  const id = await ctx.db.insert("touches", { userId, ...row });
  existing.push({ personId: p._id, ref: data.ref });
  return { person: p, touch: { ...row, id } };
}

export async function upsertSettings(ctx: MutationCtx, userId: Id<"users">, patch: Record<string, unknown>) {
  const row = await settingsRow(ctx, userId);
  if (row) return void (await ctx.db.patch(row._id, patch));
  const preset = presets.roster;
  await ctx.db.insert("crmSettings", { userId, businessName: "", yourName: "", theme: "onebb", flavor: "", quietDays: preset.defaults.quietDays, dailyGoal: preset.defaults.dailyGoal, ...patch });
}

/** Everything a member can do, given who they are. The website and Claude both go through these, so the rules are the same. */
export const ops = {
  async db(ctx: QueryCtx | MutationCtx, userId: Id<"users">): Promise<Db> {
    const preset = await flavorOf(ctx, userId);
    const s = await settingsRow(ctx, userId);
    const people: Person[] = (await mine(ctx, userId).people()).map(({ _id, _creationTime, userId: _u, ...p }) => ({ ...p, id: _id }));
    const touches: Touch[] = (await mine(ctx, userId).touches()).map((t) => ({
      id: t._id, personId: t.personId, kind: t.kind as Touch["kind"], body: t.body, at: t.at,
      ...(t.source ? { source: t.source } : {}), ...(t.ref ? { ref: t.ref } : {}),
    }));
    return {
      people, touches,
      settings: { businessName: s?.businessName ?? "", yourName: s?.yourName ?? "", theme: s?.theme ?? "onebb", quietDays: s?.quietDays ?? preset.defaults.quietDays, dailyGoal: s?.dailyGoal ?? preset.defaults.dailyGoal, customFields: s?.customFields ?? [] },
    };
  },

  async addPerson(ctx: MutationCtx, userId: Id<"users">, person: unknown) {
    if ((await mine(ctx, userId).people()).length >= MAX_PEOPLE) fail(`This site holds up to ${MAX_PEOPLE} people. Run your own copy for more.`);
    const data = await clean(ctx, userId, check(personInput.required({ name: true }), person));
    const preset = await flavorOf(ctx, userId);
    const row = { ...emptyPerson(), stage: preset.firstStage, createdAt: new Date().toISOString(), ...data };
    const id = await ctx.db.insert("people", { userId, ...row });
    return { ...row, id };
  },

  async importPeople(ctx: MutationCtx, userId: Id<"users">, rows: unknown[]) {
    const have = await mine(ctx, userId).people();
    const preset = await flavorOf(ctx, userId);
    const emails = new Set(have.map((p) => p.email.toLowerCase()).filter(Boolean));
    let added = 0;
    for (const raw of rows) {
      if (have.length + added >= MAX_PEOPLE) break;
      const row = await clean(ctx, userId, check(personInput.required({ name: true }), raw));
      const email = (row.email ?? "").toLowerCase();
      if (email && emails.has(email)) continue;
      if (email) emails.add(email);
      await ctx.db.insert("people", { userId, ...emptyPerson(), stage: preset.firstStage, createdAt: new Date().toISOString(), ...row });
      added++;
    }
    return { added, skipped: rows.length - added };
  },

  async updatePerson(ctx: MutationCtx, userId: Id<"users">, id: string, changes: unknown) {
    const p = await ownPerson(ctx, userId, id);
    const data = await clean(ctx, userId, check(personInput, changes));
    if (data.referredById === id) data.referredById = "";
    await ctx.db.patch(p._id, data);
    const { _id, _creationTime, userId: _u, ...rest } = { ...p, ...data };
    return { ...rest, id: _id };
  },

  async removePerson(ctx: MutationCtx, userId: Id<"users">, id: string) {
    const p = await ownPerson(ctx, userId, id);
    for (const t of await ctx.db.query("touches").withIndex("by_person", (q) => q.eq("personId", p._id)).collect()) await ctx.db.delete(t._id);
    for (const other of await mine(ctx, userId).people()) if (other.referredById === p._id) await ctx.db.patch(other._id, { referredById: "" });
    await ctx.db.delete(p._id);
    return { ok: true };
  },

  async addTouch(ctx: MutationCtx, userId: Id<"users">, touch: unknown) {
    const have = await mine(ctx, userId).touches();
    if (have.length >= MAX_TOUCHES) fail(`This site holds up to ${MAX_TOUCHES} conversations. Run your own copy for more.`);
    const out = await saveTouch(ctx, userId, touch, have);
    if (!out.person) fail("That person is not in your CRM.");
    return out.touch ?? { ok: true };
  },

  async importTouches(ctx: MutationCtx, userId: Id<"users">, rows: unknown[]) {
    const have = await mine(ctx, userId).touches();
    let added = 0;
    for (const raw of rows) {
      if (have.length >= MAX_TOUCHES) break;
      if ((await saveTouch(ctx, userId, raw, have)).touch) added++;
    }
    return { added, skipped: rows.length - added };
  },

  async removeTouch(ctx: MutationCtx, userId: Id<"users">, id: string) {
    const _id = ctx.db.normalizeId("touches", id);
    const t = _id && (await ctx.db.get(_id));
    if (!t || t.userId !== userId) return fail("That entry is already gone.");
    await ctx.db.delete(t._id);
    return { ok: true };
  },

  async updateSettings(ctx: MutationCtx, userId: Id<"users">, settings: unknown) {
    const data = check(settingsInput, settings);
    await upsertSettings(ctx, userId, data);
    return data;
  },

  /** Pick or switch the CRM type. Anyone sitting in a stage the new type does not have moves to its first stage. */
  async setFlavor(ctx: MutationCtx, userId: Id<"users">, flavor: Flavor) {
    const preset = presets[flavor];
    const first = !(await settingsRow(ctx, userId))?.flavor;
    await upsertSettings(ctx, userId, first ? { flavor, quietDays: preset.defaults.quietDays, dailyGoal: preset.defaults.dailyGoal } : { flavor });
    for (const p of await mine(ctx, userId).people()) if (!preset.stages.some((s) => s.id === p.stage)) await ctx.db.patch(p._id, { stage: preset.firstStage });
    return { ok: true };
  },
};

export const addPerson = mutation({ args: { person: personArgs }, handler: async (ctx, { person }) => ops.addPerson(ctx, await member(ctx), person) });
export const importPeople = mutation({ args: { rows: v.array(personArgs) }, handler: async (ctx, { rows }) => ops.importPeople(ctx, await member(ctx), rows) });
export const updatePerson = mutation({ args: { id: v.string(), changes: personArgs }, handler: async (ctx, { id, changes }) => ops.updatePerson(ctx, await member(ctx), id, changes) });
export const removePerson = mutation({ args: { id: v.string() }, handler: async (ctx, { id }) => ops.removePerson(ctx, await member(ctx), id) });
export const addTouch = mutation({ args: { touch: touchArgs }, handler: async (ctx, { touch }) => ops.addTouch(ctx, await member(ctx), touch) });
export const importTouches = mutation({ args: { rows: v.array(touchArgs) }, handler: async (ctx, { rows }) => ops.importTouches(ctx, await member(ctx), rows) });
export const removeTouch = mutation({ args: { id: v.string() }, handler: async (ctx, { id }) => ops.removeTouch(ctx, await member(ctx), id) });
export const updateSettings = mutation({
  args: { settings: v.object({ businessName: v.optional(v.string()), yourName: v.optional(v.string()), quietDays: v.optional(v.number()), dailyGoal: v.optional(v.number()), theme: v.optional(v.string()) }) },
  handler: async (ctx, { settings }) => ops.updateSettings(ctx, await member(ctx), settings),
});
export const setFlavor = mutation({
  args: { flavor: v.union(v.literal("roster"), v.literal("hitlist"), v.literal("giftbook")) },
  handler: async (ctx, { flavor }) => ops.setFlavor(ctx, await member(ctx), flavor),
});

/** Erase everything this member saved, then the sign-in itself. */
export const deleteAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return fail("Sign in first.");
    for (const t of await mine(ctx, userId).touches()) await ctx.db.delete(t._id);
    for (const p of await mine(ctx, userId).people()) await ctx.db.delete(p._id);
    const s = await settingsRow(ctx, userId);
    if (s) await ctx.db.delete(s._id);
    for (const table of ["claudeKeys", "processes", "dashCards"] as const)
      for (const row of await ctx.db.query(table).withIndex("by_user", (q) => q.eq("userId", userId)).collect()) await ctx.db.delete(row._id);
    for (const session of await ctx.db.query("authSessions").withIndex("userId", (q) => q.eq("userId", userId)).collect()) {
      for (const token of await ctx.db.query("authRefreshTokens").withIndex("sessionId", (q) => q.eq("sessionId", session._id)).collect()) await ctx.db.delete(token._id);
      await ctx.db.delete(session._id);
    }
    for (const account of await ctx.db.query("authAccounts").withIndex("userIdAndProvider", (q) => q.eq("userId", userId)).collect()) await ctx.db.delete(account._id);
    await ctx.db.delete(userId);
    return { ok: true };
  },
});
