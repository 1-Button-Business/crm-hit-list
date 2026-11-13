// Where your CRM lives: one file, data/crm.json, on your computer.
// ponytail: whole-file read and write per request. Fine into the low thousands
// of people. If it ever feels slow, ask Claude to "move the store to SQLite".
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { z } from "zod";
import { config } from "../crm.config.ts";
import { dayOf, tidyDay } from "../shared/logic.ts";
import { TOUCH_KINDS, emptyPerson } from "../shared/types.ts";
import type { Db, Person, Settings, Touch } from "../shared/types.ts";

const text = (max: number) => z.string().trim().max(max);
const BAD_DAY = "Write the date like 03-14 or 3/14";
const day = z.preprocess((v) => (typeof v === "string" ? tidyDay(v) : v), z.string().regex(/^$|^(\d{4}-)?(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, BAD_DAY));
const fullDay = z.preprocess((v) => (typeof v === "string" ? tidyDay(v) : v), z.string().regex(/^$|^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "Pick a full date, like 2026-12-01"));

export const personInput = z.object({
  name: text(200).min(1, "A name is required"),
  email: text(320),
  phone: text(60),
  company: text(200),
  address: text(500),
  birthday: day,
  dates: z.array(z.object({ label: text(80).min(1), date: day.refine((d) => d !== "", BAD_DAY) })).max(20),
  stage: text(60),
  tags: z.array(text(40).min(1)).max(30),
  referredById: text(60),
  source: text(200),
  giftIdeas: text(2000),
  about: text(10_000),
  fields: z.record(text(60), text(2000)),
  followUpOn: fullDay,
  followUpNote: text(500),
  /** Optional "known since" moment, for imports. Defaults to right now. */
  createdAt: z.string().datetime({ offset: true }),
}).partial().strict();

export const touchInput = z.object({
  personId: text(60).min(1),
  kind: z.enum(TOUCH_KINDS),
  body: text(10_000),
  at: z.string().datetime({ offset: true }).optional(),
  /** Set (or clear with "") the person's next follow-up in the same save. */
  followUpOn: fullDay.optional(),
}).strict();

export const settingsInput = z.object({
  businessName: text(200),
  yourName: text(200),
  quietDays: z.number("Type a number").int("Use a whole number").min(1, "Pick a number from 1 to 3650").max(3650, "Pick a number from 1 to 3650"),
  dailyGoal: z.number("Type a number").int("Use a whole number").min(1, "Pick a number from 1 to 500").max(500, "Pick a number from 1 to 500"),
  theme: text(40),
}).partial().strict();

const defaultSettings = (): Settings => ({
  businessName: "", yourName: "", theme: "",
  quietDays: config.defaults.quietDays, dailyGoal: config.defaults.dailyGoal,
});

export class NotFound extends Error {}

export class Store {
  file: string;
  constructor(file: string) { this.file = file; }

  read(): Db {
    if (!existsSync(this.file)) return { people: [], touches: [], settings: defaultSettings() };
    let raw: Partial<Db>;
    try { raw = JSON.parse(readFileSync(this.file, "utf8")) as Partial<Db>; }
    catch { throw new Error(`data/crm.json is damaged. Your backups are in ${join(dirname(this.file), "backups")}. Ask Claude to "restore my CRM from the latest backup".`); }
    return {
      people: (raw.people ?? []).map((p) => ({ ...emptyPerson(), ...p })),
      touches: raw.touches ?? [],
      settings: { ...defaultSettings(), ...raw.settings },
    };
  }

  private write(db: Db) {
    const dir = dirname(this.file);
    mkdirSync(join(dir, "backups"), { recursive: true });
    // One backup per day, taken before the first change of that day. Keeps 30.
    const backup = join(dir, "backups", `crm-${dayOf(new Date())}.json`);
    if (existsSync(this.file) && !existsSync(backup)) {
      copyFileSync(this.file, backup);
      const old = readdirSync(join(dir, "backups")).filter((f) => f.startsWith("crm-")).sort().slice(0, -30);
      for (const f of old) unlinkSync(join(dir, "backups", f));
    }
    // Write to a temp file, then swap. A crash mid-save can't leave half a file.
    const tmp = `${this.file}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(db, null, 2));
    renameSync(tmp, this.file);
  }

  private person(db: Db, id: string): Person {
    const p = db.people.find((x) => x.id === id);
    if (!p) throw new NotFound("That person is not in your CRM.");
    return p;
  }

  private clean(db: Db, input: z.infer<typeof personInput>) {
    if (input.stage !== undefined && !config.stages.some((s) => s.id === input.stage)) input.stage = config.firstStage;
    if (input.referredById && !db.people.some((p) => p.id === input.referredById)) input.referredById = "";
    return input;
  }

  addPerson(input: unknown): Person {
    const db = this.read();
    const data = this.clean(db, personInput.required({ name: true }).parse(input));
    const p: Person = { ...emptyPerson(), stage: config.firstStage, createdAt: new Date().toISOString(), ...data, id: randomUUID() };
    db.people.push(p);
    this.write(db);
    return p;
  }

  /** Add many at once. Skips anyone whose email is already in the CRM. */
  importPeople(inputs: unknown): { added: number; skipped: number } {
    const db = this.read();
    const rows = z.array(personInput.required({ name: true })).max(5000).parse(inputs);
    const emails = new Set(db.people.map((p) => p.email.toLowerCase()).filter(Boolean));
    let added = 0;
    for (const row of rows) {
      const email = (row.email ?? "").toLowerCase();
      if (email && emails.has(email)) continue;
      if (email) emails.add(email);
      db.people.push({ ...emptyPerson(), stage: config.firstStage, createdAt: new Date().toISOString(), ...this.clean(db, row), id: randomUUID() });
      added++;
    }
    if (added) this.write(db);
    return { added, skipped: rows.length - added };
  }

  updatePerson(id: string, input: unknown): Person {
    const db = this.read();
    const p = this.person(db, id);
    const data = this.clean(db, personInput.parse(input));
    if (data.referredById === id) data.referredById = "";
    Object.assign(p, data);
    this.write(db);
    return p;
  }

  removePerson(id: string) {
    const db = this.read();
    this.person(db, id);
    db.people = db.people.filter((p) => p.id !== id);
    db.touches = db.touches.filter((t) => t.personId !== id);
    for (const p of db.people) if (p.referredById === id) p.referredById = "";
    this.write(db);
  }

  addTouch(input: unknown): Touch {
    const db = this.read();
    const data = touchInput.parse(input);
    const p = this.person(db, data.personId);
    // One save for both, so a reach-out can never be logged twice by a retry.
    if (data.followUpOn !== undefined) { p.followUpOn = data.followUpOn; p.followUpNote = ""; }
    const t: Touch = { id: randomUUID(), personId: data.personId, kind: data.kind, body: data.body, at: data.at ?? new Date().toISOString() };
    db.touches.push(t);
    this.write(db);
    return t;
  }

  removeTouch(id: string) {
    const db = this.read();
    if (!db.touches.some((t) => t.id === id)) throw new NotFound("That entry is already gone.");
    db.touches = db.touches.filter((t) => t.id !== id);
    this.write(db);
  }

  updateSettings(input: unknown): Settings {
    const db = this.read();
    Object.assign(db.settings, settingsInput.parse(input));
    this.write(db);
    return db.settings;
  }
}

export const dataFile = () => process.env.CRM_DATA_FILE ?? join(import.meta.dirname, "..", "data", "crm.json");
