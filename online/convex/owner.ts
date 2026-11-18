// For a member's own site only. Run from the command line, never from the website:
//   npx convex run --prod owner:resetLogin
// Removes the password and signs out every device. The list stays. Then make a new login on the site
// with the setup code (it finds the same list).
import { internalMutation } from "./_generated/server";

export const resetLogin = internalMutation({
  args: {},
  handler: async (ctx) => {
    let removed = 0;
    for (const a of await ctx.db.query("authAccounts").collect()) {
      if (a.provider !== "password") continue;
      for (const s of await ctx.db.query("authSessions").withIndex("userId", (q) => q.eq("userId", a.userId)).collect()) {
        for (const r of await ctx.db.query("authRefreshTokens").withIndex("sessionId", (q) => q.eq("sessionId", s._id)).collect()) await ctx.db.delete(r._id);
        await ctx.db.delete(s._id);
      }
      await ctx.db.delete(a._id);
      removed++;
    }
    return { removed };
  },
});
