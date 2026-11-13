// This is how Claude plugs into your CRM. It gives Claude a few safe tools:
// look people up, add a person, save a note, set a follow-up.
// Claude Code starts it by itself (see .mcp.json). You never run it by hand.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { config, restStages } from "../crm.config.ts";
import { dayOf, dueFollowUps, lastReachOutByPerson, quietFor, quietPeople, reachOutsOn, referrers, streak, upcomingDates } from "../shared/logic.ts";
import { TOUCH_KINDS } from "../shared/types.ts";
import type { Person } from "../shared/types.ts";
import { Store, dataFile, personInput } from "../server/store.ts";

const store = new Store(dataFile());
const server = new McpServer({ name: "my-crm", version: "1.0.0" });
const reply = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });
const brief = (p: Person) => ({ id: p.id, name: p.name, stage: p.stage, phone: p.phone, email: p.email, followUpOn: p.followUpOn });

/** Wrap a tool so a problem comes back as a plain sentence instead of a crash. */
const safe = <A,>(run: (args: A) => unknown) => async (args: A) => {
  try { return reply(run(args)); }
  catch (e) { return { isError: true, content: [{ type: "text" as const, text: e instanceof z.ZodError ? e.issues[0]?.message ?? "That input is not right." : e instanceof Error ? e.message : "Something went wrong." }] }; }
};

server.registerTool("crm_today", {
  description: "What needs attention today: follow-ups due, birthdays and dates in the next 7 days, people who have gone quiet, today's reach-out count against the daily goal, and thank-yous owed to referrers. Start here for 'who should I reach out to?'.",
  inputSchema: {},
}, safe(() => {
  const db = store.read();
  const today = dayOf(new Date());
  return {
    today,
    business: db.settings.businessName,
    reachOutsToday: reachOutsOn(db.touches, today),
    dailyGoal: db.settings.dailyGoal,
    streakDays: streak(db.touches, db.settings.dailyGoal, today),
    followUpsDue: dueFollowUps(db.people, today).map((p) => ({ ...brief(p), note: p.followUpNote })),
    datesThisWeek: upcomingDates(db.people, today, 7).map((d) => ({ ...brief(d.person), what: d.label, inDays: d.inDays })),
    goneQuiet: quietPeople(db.people, db.touches, db.settings.quietDays, today, restStages).slice(0, 25).map((q) => ({ ...brief(q.person), daysQuiet: q.days })),
    thankYousOwed: referrers(db.people, db.touches).filter((r) => r.thankYouOwed.length).map((r) => ({ ...brief(r.person), sentYou: r.thankYouOwed.map((p) => p.name) })),
  };
}));

server.registerTool("crm_find_people", {
  description: "Search people by any words (name, email, phone, company, tag, notes) and/or stage. Leave both empty to list everyone. Returns short cards; use crm_get_person for the full record.",
  inputSchema: { search: z.string().max(200).optional(), stage: z.string().max(60).optional(), limit: z.number().int().min(1).max(500).optional() },
}, safe(({ search, stage, limit }: { search?: string; stage?: string; limit?: number }) => {
  const db = store.read();
  const words = (search ?? "").toLowerCase().trim();
  const hits = db.people
    .filter((p) => !stage || p.stage === stage)
    .filter((p) => !words || [p.name, p.email, p.phone, p.company, p.source, p.about, ...p.tags, ...Object.values(p.fields)].join(" ").toLowerCase().includes(words));
  return { total: hits.length, stages: config.stages.map((s) => s.id), people: hits.slice(0, limit ?? 50).map(brief) };
}));

server.registerTool("crm_get_person", {
  description: "Everything about one person: details, extra fields, who referred them, and their full history newest first.",
  inputSchema: { id: z.string().max(60) },
}, safe(({ id }: { id: string }) => {
  const db = store.read();
  const person = db.people.find((p) => p.id === id);
  if (!person) throw new Error("No person has that id. Use crm_find_people first.");
  const last = lastReachOutByPerson(db.touches);
  return {
    person,
    referredBy: db.people.find((p) => p.id === person.referredById)?.name ?? "",
    daysSinceReachOut: quietFor(person, last, dayOf(new Date())),
    history: db.touches.filter((t) => t.personId === id).sort((a, b) => b.at.localeCompare(a.at)),
  };
}));

server.registerTool("crm_add_person", {
  description: `Add a new person. Only name is required. stage must be one of: ${config.stages.map((s) => s.id).join(", ")}. birthday is MM-DD. followUpOn is YYYY-MM-DD. Check crm_find_people first so you do not add a double.`,
  inputSchema: personInput.required({ name: true }).shape,
}, safe((input: unknown) => brief(store.addPerson(input))));

server.registerTool("crm_update_person", {
  description: "Change fields on a person: stage, contact details, about (the pinned note), tags, birthday, address, giftIdeas, followUpOn and followUpNote, referredById, or extra fields. Send only what changes. Set followUpOn to an empty string to clear it.",
  inputSchema: { id: z.string().max(60), changes: personInput },
}, safe(({ id, changes }: { id: string; changes: unknown }) => brief(store.updatePerson(id, changes))));

server.registerTool("crm_log", {
  description: "Save something that happened with a person. kind 'note' is a private note. call, text, email, dm, meeting and gift count as reach-outs toward the daily goal. order records what they bought. Leave 'at' out for right now, or pass an ISO time with offset for something in the past. This only records it; it does not send anything.",
  inputSchema: { personId: z.string().max(60), kind: z.enum(TOUCH_KINDS), body: z.string().max(10_000), at: z.string().datetime({ offset: true }).optional() },
}, safe((input: unknown) => store.addTouch(input)));

await server.connect(new StdioServerTransport());
