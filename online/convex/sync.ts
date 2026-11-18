// Keeps the member list in step with 1BB. Once a day it pulls the current members' emails from
// the 1BB community app (GET /ops/crm/member-emails), adds new members, and removes members the
// sync itself added once they leave 1BB. Emails added by hand (guests, extra addresses) are never removed.
// Env on this deployment: ONEBB_MEMBERS_URL and CRM_SYNC_TOKEN (the same token the 1BB app holds).
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction, internalMutation } from "./_generated/server";

/** A sudden drop usually means a broken list, not a mass cancellation. Then nobody is removed. */
export function safeToRemove(listSize: number, synced: number, leaving: number): boolean {
  if (listSize < 5) return false;
  return leaving <= Math.max(3, Math.floor(synced * 0.2));
}

export const apply = internalMutation({
  args: { emails: v.array(v.string()) },
  handler: async (ctx, { emails }) => {
    const current = new Set(emails.map((e) => e.trim().toLowerCase()).filter((e) => e.includes("@")));
    // ponytail: whole list (under 100 rows today); page it past a few thousand members.
    const rows = await ctx.db.query("members").collect();
    const have = new Map(rows.map((r) => [r.email, r]));
    let added = 0, tagged = 0;
    for (const email of current) {
      const row = have.get(email);
      if (!row) { await ctx.db.insert("members", { email, source: "1bb" }); added++; }
      else if (row.source !== "1bb") { await ctx.db.patch(row._id, { source: "1bb" }); tagged++; }
    }
    const synced = rows.filter((r) => r.source === "1bb").length + tagged;
    const leaving = rows.filter((r) => r.source === "1bb" && !current.has(r.email));
    const removeOk = safeToRemove(current.size, synced, leaving.length);
    if (removeOk) for (const r of leaving) await ctx.db.delete(r._id);
    else if (leaving.length) console.warn(`member sync: kept ${leaving.length} leaving members because the list looks wrong (${current.size} emails)`);
    return { listSize: current.size, added, tagged, removed: removeOk ? leaving.length : 0, held: removeOk ? 0 : leaving.length };
  },
});

type SyncResult = { listSize: number; added: number; tagged: number; removed: number; held: number };

export const run = internalAction({
  args: {},
  handler: async (ctx): Promise<SyncResult | null> => {
    const url = process.env.ONEBB_MEMBERS_URL, token = process.env.CRM_SYNC_TOKEN;
    if (!url || !token) { console.warn("member sync: ONEBB_MEMBERS_URL or CRM_SYNC_TOKEN not set, skipped"); return null; }
    const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`member sync: 1BB answered ${res.status}`);
    const body = (await res.json()) as { emails?: unknown };
    if (!Array.isArray(body.emails) || !body.emails.every((e) => typeof e === "string")) throw new Error("member sync: 1BB sent a list in the wrong shape");
    const result: SyncResult = await ctx.runMutation(internal.sync.apply, { emails: body.emails as string[] });
    console.log("member sync", JSON.stringify(result));
    return result;
  },
});
