// The admin view for 1BB staff (emails in the ADMIN_EMAILS setting on Convex).
// By default admins see only how each member is doing: setup, counts, last active.
// The list shows health; Open shows that member's whole CRM, read only.
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import { query } from "./_generated/server";
import { SETUP_STEPS } from "./claude";
import { fail, ops, settingsRow } from "./crm";

const admins = () => (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

async function adminEmail(ctx: QueryCtx): Promise<string | null> {
  const userId = await getAuthUserId(ctx);
  const email = userId ? ((await ctx.db.get(userId))?.email ?? "").toLowerCase() : "";
  return email && admins().includes(email) ? email : null;
}

export const amAdmin = query({ args: {}, handler: async (ctx) => (await adminEmail(ctx)) !== null });

async function userByEmail(ctx: QueryCtx, email: string) {
  return await ctx.db.query("users").withIndex("email", (q) => q.eq("email", email)).first();
}

/** One row per member: health only, never their people. */
export const members = query({
  args: {},
  handler: async (ctx) => {
    if (!(await adminEmail(ctx))) return fail("Admins only.");
    const rows = [];
    // ponytail: one page of 500 members; page it when 1BB grows past that.
    for (const m of await ctx.db.query("members").take(500)) {
      const user = await userByEmail(ctx, m.email);
      if (!user) { rows.push({ email: m.email, joined: false, type: "", people: 0, conversations: 0, cards: 0, processes: 0, claude: false, claudeLastUsed: "", setupDone: 0, setupTotal: SETUP_STEPS.length, lastActive: "" }); continue; }
      const s = await settingsRow(ctx, user._id);
      const people = await ctx.db.query("people").withIndex("by_user", (q) => q.eq("userId", user._id)).collect();
      const touches = await ctx.db.query("touches").withIndex("by_user", (q) => q.eq("userId", user._id)).collect();
      const keys = await ctx.db.query("claudeKeys").withIndex("by_user", (q) => q.eq("userId", user._id)).collect();
      const cards = await ctx.db.query("dashCards").withIndex("by_user", (q) => q.eq("userId", user._id)).collect();
      const processes = await ctx.db.query("processes").withIndex("by_user", (q) => q.eq("userId", user._id)).collect();
      const claudeLastUsed = keys.map((k) => k.lastUsedAt).sort().pop() ?? "";
      const lastTouch = touches.map((t) => t.at).sort().pop() ?? "";
      const lastPerson = people.map((p) => p.createdAt).sort().pop() ?? "";
      rows.push({
        email: m.email, joined: true, type: s?.flavor ?? "", people: people.length, conversations: touches.length,
        cards: cards.length, processes: processes.length, claude: keys.length > 0, claudeLastUsed,
        setupDone: Object.values(s?.onboarding ?? {}).filter((x) => x === "done").length, setupTotal: SETUP_STEPS.length,
        lastActive: [claudeLastUsed, lastTouch, lastPerson].sort().pop() ?? "",
      });
    }
    return rows.sort((a, b) => b.lastActive.localeCompare(a.lastActive));
  },
});

/** A member's whole CRM, read only. */
export const memberCrm = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    if (!(await adminEmail(ctx))) return fail("Admins only.");
    const user = await userByEmail(ctx, email.trim().toLowerCase());
    if (!user) return fail("That member has not signed in yet.");
    const db = await ops.db(ctx, user._id);
    const processes = (await ctx.db.query("processes").withIndex("by_user", (q) => q.eq("userId", user._id)).collect()).map(({ name, when, steps }) => ({ name, when, steps }));
    const cards = (await ctx.db.query("dashCards").withIndex("by_user", (q) => q.eq("userId", user._id)).collect()).map(({ title, value, source }) => ({ title, value, source }));
    return { ...db, processes, cards };
  },
});
