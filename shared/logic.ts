// The thinking part of the CRM, with no screen and no storage.
// Every rule here has a test in logic.test.ts. Change a rule, run `npm test`.
import type { Person, Touch } from "./types.ts";

const DAY = 86_400_000;

/** Local "YYYY-MM-DD" for a Date. */
export function dayOf(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function parseDay(day: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function addDays(day: string, n: number): string {
  const d = parseDay(day);
  d.setDate(d.getDate() + n);
  return dayOf(d);
}

export function daysBetween(fromDay: string, toDay: string): number {
  return Math.round((parseDay(toDay).getTime() - parseDay(fromDay).getTime()) / DAY);
}

/** Notes and orders are records. Calls, texts, emails, DMs, meetings and gifts count as reaching out. */
export const isReachOut = (t: Touch) => t.kind !== "note" && t.kind !== "order";

/** personId -> day of the last time you actually reached out. */
export function lastReachOutByPerson(touches: Touch[]): Map<string, string> {
  const last = new Map<string, string>();
  for (const t of touches) {
    if (!isReachOut(t)) continue;
    const day = dayOf(new Date(t.at));
    const prev = last.get(t.personId);
    if (!prev || day > prev) last.set(t.personId, day);
  }
  return last;
}

/** Days since you last reached out. Falls back to the day you added them. */
export function quietFor(p: Person, last: Map<string, string>, today: string): number {
  return daysBetween(last.get(p.id) ?? dayOf(new Date(p.createdAt)), today);
}

/**
 * "Haven't talked in a while": quiet for quietDays or more.
 * A future follow-up date means you already have a plan, so they are left out.
 * Stages marked `rest` (not a fit, lost) are left out too.
 */
export function quietPeople(
  people: Person[], touches: Touch[], quietDays: number, today: string, restStages: string[] = [],
): { person: Person; days: number }[] {
  const last = lastReachOutByPerson(touches);
  return people
    .filter((p) => !restStages.includes(p.stage))
    .filter((p) => !(p.followUpOn && p.followUpOn > today))
    .map((person) => ({ person, days: quietFor(person, last, today) }))
    .filter((x) => x.days >= quietDays)
    .sort((a, b) => b.days - a.days);
}

/** Follow-ups due today or overdue, oldest first. */
export function dueFollowUps(people: Person[], today: string): Person[] {
  return people
    .filter((p) => p.followUpOn && p.followUpOn <= today)
    .sort((a, b) => a.followUpOn.localeCompare(b.followUpOn));
}

/** Days until the next time this month and day comes around. 0 means today. */
export function daysUntilNext(date: string, today: string): number | null {
  const m = /(\d{1,2})-(\d{1,2})$/.exec(date.trim());
  if (!m) return null;
  const month = Number(m[1]), dom = Number(m[2]);
  if (month < 1 || month > 12 || dom < 1 || dom > 31) return null;
  const t = parseDay(today);
  for (let year = t.getFullYear(); year <= t.getFullYear() + 1; year++) {
    // Feb 29 on a normal year is celebrated on Feb 28.
    const leapOk = month !== 2 || dom !== 29 || new Date(year, 1, 29).getMonth() === 1;
    const next = new Date(year, month - 1, leapOk ? dom : 28);
    const diff = Math.round((next.getTime() - t.getTime()) / DAY);
    if (diff >= 0) return diff;
  }
  return null;
}

export type UpcomingDate = { person: Person; label: string; date: string; inDays: number };

/** Birthdays and other saved dates coming up in the next `within` days. */
export function upcomingDates(people: Person[], today: string, within: number): UpcomingDate[] {
  const out: UpcomingDate[] = [];
  for (const person of people) {
    const all = [{ label: "Birthday", date: person.birthday }, ...person.dates];
    for (const { label, date } of all) {
      if (!date) continue;
      const inDays = daysUntilNext(date, today);
      if (inDays !== null && inDays <= within) out.push({ person, label, date, inDays });
    }
  }
  return out.sort((a, b) => a.inDays - b.inDays);
}

/** How many reach-outs you made on a given day. */
export function reachOutsOn(touches: Touch[], day: string): number {
  return touches.filter((t) => isReachOut(t) && dayOf(new Date(t.at)) === day).length;
}

/**
 * Days in a row you hit your daily goal. Today counts once you hit it,
 * and an unfinished today does not break the streak.
 */
export function streak(touches: Touch[], goal: number, today: string): number {
  if (goal <= 0) return 0;
  const perDay = new Map<string, number>();
  for (const t of touches) {
    if (!isReachOut(t)) continue;
    const d = dayOf(new Date(t.at));
    perDay.set(d, (perDay.get(d) ?? 0) + 1);
  }
  const hit = (d: string) => (perDay.get(d) ?? 0) >= goal;
  let n = 0;
  let day = hit(today) ? today : addDays(today, -1);
  while (hit(day)) { n++; day = addDays(day, -1); }
  return n;
}

export type Referrer = { person: Person; sent: Person[]; thankYouOwed: Person[] };

/**
 * Who sends you people. A thank-you is owed for each referral where you have
 * not reached out to the referrer since the new person was added.
 */
export function referrers(people: Person[], touches: Touch[]): Referrer[] {
  const byId = new Map(people.map((p) => [p.id, p]));
  const last = lastReachOutByPerson(touches);
  const map = new Map<string, Referrer>();
  for (const p of people) {
    const from = byId.get(p.referredById);
    if (!from) continue;
    const r = map.get(from.id) ?? { person: from, sent: [], thankYouOwed: [] };
    r.sent.push(p);
    const thanked = (last.get(from.id) ?? "") >= dayOf(new Date(p.createdAt));
    if (!thanked) r.thankYouOwed.push(p);
    map.set(from.id, r);
  }
  return [...map.values()].sort((a, b) => b.sent.length - a.sent.length);
}

/**
 * Accept dates the way people type them and store them one way.
 * "3/14" -> "03-14", "3/14/1990" -> "1990-03-14", "1990-3-14" -> "1990-03-14".
 * Anything it can't read comes back unchanged so the checker can refuse it.
 */
export function tidyDay(input: string): string {
  const s = input.trim();
  const p = (n: string) => n.padStart(2, "0");
  let m = /^(\d{1,2})[/.-](\d{1,2})$/.exec(s);
  if (m) return `${p(m[1]!)}-${p(m[2]!)}`;
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
  if (m) return `${m[3]}-${p(m[1]!)}-${p(m[2]!)}`;
  m = /^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/.exec(s);
  if (m) return `${m[1]}-${p(m[2]!)}-${p(m[3]!)}`;
  return s;
}

/** Swap {first}, {name}, {me}, {business} in a message template. */
export function fillTemplate(
  text: string, person: Pick<Person, "name">, me: { yourName: string; businessName: string },
): string {
  const first = person.name.trim().split(/\s+/)[0] ?? "";
  return text
    .replaceAll("{first}", first)
    .replaceAll("{name}", person.name.trim())
    .replaceAll("{me}", me.yourName)
    .replaceAll("{business}", me.businessName);
}

/** Read CSV text into rows. Handles quotes, commas inside quotes and blank lines. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

const COLUMN_HINTS: [keyof ImportRow, RegExp][] = [
  ["email", /e-?mail/i],
  ["phone", /phone|mobile|cell|number/i],
  ["company", /company|business|organi[sz]ation/i],
  ["address", /address|street/i],
  ["birthday", /birth|bday|dob/i],
  ["source", /source|how did you/i],
  ["about", /about|note|comment|goal|message|stopping/i],
  ["name", /name/i],
];

export type ImportRow = {
  name: string; email: string; phone: string; company: string;
  address: string; birthday: string; source: string; about: string;
};

/**
 * Turn a spreadsheet export (ManyChat, a Google Form, your old CRM) into people.
 * Guesses which column is which from the header row. First and last name
 * columns are joined. Rows with no name and no email are skipped.
 */
export function rowsToPeople(rows: string[][]): ImportRow[] {
  const [header, ...body] = rows;
  if (!header) return [];
  const cols = header.map((h) => {
    const hit = COLUMN_HINTS.find(([, re]) => re.test(h));
    return { key: hit?.[0], last: /last|surname/i.test(h) };
  });
  const out: ImportRow[] = [];
  for (const r of body) {
    const p: ImportRow = { name: "", email: "", phone: "", company: "", address: "", birthday: "", source: "", about: "" };
    let lastName = "";
    cols.forEach((c, i) => {
      const v = (r[i] ?? "").trim();
      if (!c.key || !v) return;
      if (c.key === "name" && c.last) lastName = v;
      else if (c.key === "about") p.about = p.about ? `${p.about}\n${v}` : v;
      else if (!p[c.key]) p[c.key] = v;
    });
    p.name = [p.name, lastName].filter(Boolean).join(" ") || p.email.split("@")[0] || "";
    if (p.name) out.push(p);
  }
  return out;
}

/** People as CSV text, for backups and moving to another tool. */
export function peopleToCsv(people: Person[]): string {
  const cols = ["name", "email", "phone", "company", "address", "birthday", "stage", "source", "followUpOn", "about"] as const;
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);
  return [cols.join(","), ...people.map((p) => cols.map((c) => esc(p[c])).join(","))].join("\n");
}
