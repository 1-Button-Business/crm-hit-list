// Every table the hosted CRM uses. Each row carries the owner's userId,
// and every function checks it, so one member can never see another's list.
import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const personFields = {
  name: v.string(), email: v.string(), phone: v.string(), company: v.string(), address: v.string(),
  birthday: v.string(), dates: v.array(v.object({ label: v.string(), date: v.string() })),
  stage: v.string(), tags: v.array(v.string()), referredById: v.string(), source: v.string(),
  giftIdeas: v.string(), about: v.string(), fields: v.record(v.string(), v.string()),
  followUpOn: v.string(), followUpNote: v.string(), createdAt: v.string(),
};

export default defineSchema({
  ...authTables,
  /** Who may use the site. One row per member email, lower case. */
  // source "1bb": added by the daily sync (removed when they leave 1BB). No source: added by hand, never auto-removed.
  members: defineTable({ email: v.string(), source: v.optional(v.literal("1bb")) }).index("by_email", ["email"]),
  people: defineTable({ userId: v.id("users"), ...personFields }).index("by_user", ["userId"]),
  touches: defineTable({
    userId: v.id("users"), personId: v.id("people"), kind: v.string(), body: v.string(), at: v.string(),
    source: v.optional(v.string()), ref: v.optional(v.string()),
  }).index("by_user", ["userId"]).index("by_person", ["personId"]),
  crmSettings: defineTable({
    userId: v.id("users"), businessName: v.string(), yourName: v.string(),
    quietDays: v.number(), dailyGoal: v.number(), theme: v.string(),
    /** roster, hitlist or giftbook. Empty until they pick. */
    flavor: v.string(),
    /** Extra boxes on every person, added by the member (usually through Claude). */
    customFields: v.optional(v.array(v.object({ id: v.string(), label: v.string() }))),
    /** Setup steps the member finished or skipped: step id -> "done" | "skipped". */
    onboarding: v.optional(v.record(v.string(), v.string())),
    /** Off unless the member turns it on: lets 1BB admins open their people and notes to help. */
    shareWithAdmins: v.optional(v.boolean()),
  }).index("by_user", ["userId"]),
  /** Keys that let a member's own Claude reach their CRM. Only a SHA-256 hash is stored. */
  claudeKeys: defineTable({
    userId: v.id("users"), hash: v.string(), label: v.string(), hint: v.string(), createdAt: v.string(), lastUsedAt: v.string(),
  }).index("by_hash", ["hash"]).index("by_user", ["userId"]),
  /** The member's own ways of working, written in plain words. Claude reads and follows them. */
  processes: defineTable({
    userId: v.id("users"), name: v.string(), when: v.string(), steps: v.string(), updatedAt: v.string(),
  }).index("by_user", ["userId"]),
  /** The member's own dashboard: numbers their Claude brings in from Stripe, HubSpot, QuickBooks and so on. */
  dashCards: defineTable({
    userId: v.id("users"), title: v.string(), value: v.string(), note: v.string(), source: v.string(), link: v.string(), updatedAt: v.string(),
  }).index("by_user", ["userId"]),
});
