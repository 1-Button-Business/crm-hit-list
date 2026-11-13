// The online demo has no server. This file plays the server's part inside the
// visitor's own browser, so they can click around with made-up people.
// Your real CRM never uses this file. It only runs when built with VITE_DEMO=1.
import { config } from "../crm.config.ts";
import { dayOf, peopleToCsv, tidyDay } from "../shared/logic.ts";
import { emptyPerson } from "../shared/types.ts";
import type { Db, Person, Touch } from "../shared/types.ts";
import { samplePeople } from "./sample.ts";

const KEY = `crm-demo-${config.title}`;
const id = () => crypto.randomUUID();
const ago = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

function seed(): Db {
  const today = dayOf(new Date());
  const people: Person[] = samplePeople(today).map((p) => ({ ...emptyPerson(), stage: config.firstStage, createdAt: ago(20), ...p, id: id() }));
  const by = (name: string) => people.find((p) => p.name.startsWith(name))!;
  by("Derrick").referredById = by("Maya").id;
  by("Tom").referredById = by("Maya").id;
  by("Maya").tags = ["VIP", "Referrer"];
  const t = (name: string, kind: Touch["kind"], body: string, days: number): Touch => ({ id: id(), personId: by(name).id, kind, body, at: ago(days) });
  const touches = [
    t("Maya", "call", "Great catch-up. Asked how the kids are doing.", 9),
    t("Maya", "gift", "Coffee sampler as a thank-you", 30),
    t("Maya", "note", "Prefers texts over calls. Mornings are best.", 40),
    t("Renee", "text", "Checked in after we wrapped up.", 75),
    ...[1, 1, 1, 1, 1, 2, 2, 2, 2, 2].map((d) => t("Jordan", "dm", "Replied to their story", d)),
    t("Priya", "email", "Sent call times", 0),
    t("Derrick", "text", "Sent pricing", 0),
  ];
  return { people, touches, settings: { businessName: "Bright Path Co.", yourName: "Sam", theme: "", ...config.defaults } };
}

function load(): Db {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw) as Db; } catch { /* start fresh */ }
  return seed();
}
function keep(db: Db) { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* private window: lives until reload */ } }
let db = load();

export function resetDemo() { db = seed(); keep(db); }
export const demoExportUrl = () => URL.createObjectURL(new Blob([peopleToCsv(db.people)], { type: "text/csv" }));

const fail = (message: string): never => { throw new Error(message); };
function tidy(input: Partial<Person>): Partial<Person> {
  const out = { ...input };
  if (out.name !== undefined && !out.name.trim()) fail("A name is required");
  for (const k of ["birthday", "followUpOn"] as const) {
    if (out[k] === undefined) continue;
    out[k] = tidyDay(out[k]!);
    if (out[k] && !/^(\d{4}-)?\d{2}-\d{2}$/.test(out[k]!)) fail("Write the date like 03-14 or 3/14");
  }
  return out;
}

export async function demoCall<T>(method: string, path: string, body?: unknown): Promise<T> {
  const [thing, key] = path.split("/");
  const data = (body ?? {}) as Record<string, unknown>;
  const person = () => db.people.find((p) => p.id === key) ?? fail("That person is not in your CRM.");
  let out: unknown = { ok: true };
  switch (`${method} ${thing}${key ? "/:id" : ""}`) {
    case "GET db": break;
    case "POST people": { const p: Person = { ...emptyPerson(), stage: config.firstStage, createdAt: new Date().toISOString(), ...tidy(data as Partial<Person>), id: id() }; if (!p.name.trim()) fail("A name is required"); db.people.push(p); out = p; break; }
    case "POST import": { const rows = body as Partial<Person>[]; for (const r of rows) db.people.push({ ...emptyPerson(), stage: config.firstStage, createdAt: new Date().toISOString(), ...tidy(r), id: id() }); out = { added: rows.length, skipped: 0 }; break; }
    case "PATCH people/:id": out = Object.assign(person(), tidy(data as Partial<Person>)); break;
    case "DELETE people/:id": person(); db.people = db.people.filter((p) => p.id !== key); db.touches = db.touches.filter((t) => t.personId !== key); break;
    case "POST touches": {
      const p = db.people.find((x) => x.id === data.personId) ?? fail("That person is not in your CRM.");
      if (typeof data.followUpOn === "string") { p.followUpOn = data.followUpOn; p.followUpNote = ""; }
      const t: Touch = { id: id(), personId: p.id, kind: data.kind as Touch["kind"], body: String(data.body ?? ""), at: new Date().toISOString() };
      db.touches.push(t); out = t; break;
    }
    case "DELETE touches/:id": db.touches = db.touches.filter((t) => t.id !== key); break;
    case "PATCH settings": {
      for (const k of ["dailyGoal", "quietDays"] as const) if (k in data && !(Number.isInteger(data[k]) && (data[k] as number) >= 1)) fail("Pick a number from 1 to 500");
      out = Object.assign(db.settings, data); break;
    }
    default: fail("Nothing lives at that address.");
  }
  keep(db);
  // Hand back copies, the way a real server would.
  return structuredClone(thing === "db" ? db : out) as T;
}
