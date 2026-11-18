// The member list. Only reachable from the command line or the Convex
// dashboard (internal functions), never from the website.
import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

export const add = internalMutation({
  args: { emails: v.array(v.string()) },
  handler: async (ctx, { emails }) => {
    let added = 0;
    for (const raw of emails) {
      const email = raw.trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) continue;
      if (await ctx.db.query("members").withIndex("by_email", (q) => q.eq("email", email)).first()) continue;
      await ctx.db.insert("members", { email });
      added++;
    }
    return { added, skipped: emails.length - added };
  },
});

export const remove = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const row = await ctx.db.query("members").withIndex("by_email", (q) => q.eq("email", email.trim().toLowerCase())).first();
    if (row) await ctx.db.delete(row._id);
    return { removed: row !== null };
  },
});

export const count = internalQuery({ args: {}, handler: async (ctx) => (await ctx.db.query("members").collect()).length });
