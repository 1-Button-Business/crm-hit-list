import { test } from "node:test";
import assert from "node:assert/strict";
import type { Person, Touch } from "./types.ts";
import { emptyPerson } from "./types.ts";
import {
  addDays, daysUntilNext, dueFollowUps, fillTemplate, parseCsv, peopleToCsv, quietPeople,
  reachOutsOn, referrers, rowsToPeople, streak, tidyDay, upcomingDates,
} from "./logic.ts";

const TODAY = "2026-11-18";
const at = (day: string) => `${day}T12:00:00`;
const person = (id: string, over: Partial<Person> = {}): Person =>
  ({ ...emptyPerson(), id, name: id, createdAt: at("2026-01-01"), ...over });
const touch = (personId: string, day: string, kind: Touch["kind"] = "call"): Touch =>
  ({ id: `${personId}-${day}-${kind}`, personId, kind, body: "", at: at(day) });

test("quiet people: quiet long enough, most quiet first", () => {
  const people = [person("a"), person("b"), person("c")];
  const touches = [touch("a", "2026-11-10"), touch("b", "2026-09-01"), touch("c", "2026-10-01")];
  const q = quietPeople(people, touches, 30, TODAY);
  assert.deepEqual(q.map((x) => x.person.id), ["b", "c"]);
  assert.equal(q[0]!.days, 78);
});

test("quiet people: notes and orders are not reach-outs, a gift is", () => {
  const q = quietPeople([person("a")], [touch("a", "2026-11-17", "note"), touch("a", "2026-11-17", "order")], 30, TODAY);
  assert.equal(q.length, 1);
  assert.equal(quietPeople([person("a")], [touch("a", "2026-11-17", "gift")], 30, TODAY).length, 0);
});

test("quiet people: a future follow-up or a rest stage keeps them off the list", () => {
  const people = [person("plan", { followUpOn: "2027-02-01" }), person("lost", { stage: "nofit" }), person("due", { followUpOn: "2026-11-01" })];
  const q = quietPeople(people, [], 30, TODAY, ["nofit"]);
  assert.deepEqual(q.map((x) => x.person.id), ["due"]);
});

test("follow-ups: due today and overdue only, oldest first", () => {
  const people = [person("later", { followUpOn: "2026-11-19" }), person("today", { followUpOn: TODAY }), person("late", { followUpOn: "2026-11-01" }), person("none")];
  assert.deepEqual(dueFollowUps(people, TODAY).map((p) => p.id), ["late", "today"]);
});

test("dates: today is 0, year wraps, bad input is null", () => {
  assert.equal(daysUntilNext("1990-11-18", TODAY), 0);
  assert.equal(daysUntilNext("11-20", TODAY), 2);
  assert.equal(daysUntilNext("01-05", "2026-12-30"), 6);
  assert.equal(daysUntilNext("11-17", TODAY), 364);
  assert.equal(daysUntilNext("not a date", TODAY), null);
  assert.equal(daysUntilNext("13-40", TODAY), null);
});

test("dates: Feb 29 birthdays land on Feb 28 in a normal year", () => {
  assert.equal(daysUntilNext("02-29", "2027-02-27"), 1);
  assert.equal(daysUntilNext("02-29", "2028-02-27"), 2);
});

test("upcoming dates: birthday plus saved dates inside the window", () => {
  const people = [person("a", { birthday: "11-20", dates: [{ label: "Closing", date: "2024-12-25" }] }), person("b", { birthday: "06-01" })];
  const up = upcomingDates(people, TODAY, 14);
  assert.deepEqual(up.map((u) => [u.person.id, u.label, u.inDays]), [["a", "Birthday", 2]]);
  assert.equal(upcomingDates(people, TODAY, 60).length, 2);
});

test("reach-outs today and streak", () => {
  const touches = [touch("a", TODAY), touch("b", TODAY, "text"), touch("a", TODAY, "note"),
    touch("a", "2026-11-17"), touch("b", "2026-11-17", "dm"), touch("a", "2026-11-16"), touch("b", "2026-11-16")];
  assert.equal(reachOutsOn(touches, TODAY), 2);
  assert.equal(streak(touches, 2, TODAY), 3);
  assert.equal(streak(touches, 3, TODAY), 0);
  // an unfinished today does not break yesterday's streak
  assert.equal(streak(touches.filter((t) => !t.at.startsWith(TODAY)), 2, TODAY), 2);
  assert.equal(streak(touches, 0, TODAY), 0);
});

test("referrers: counts, and thank-you owed until you reach out to them", () => {
  const people = [person("kev"), person("new1", { referredById: "kev", createdAt: at("2026-11-10") }), person("new2", { referredById: "kev", createdAt: at("2026-11-01") }), person("orphan", { referredById: "gone" })];
  let r = referrers(people, [touch("kev", "2026-11-05")]);
  assert.equal(r.length, 1);
  assert.equal(r[0]!.sent.length, 2);
  assert.deepEqual(r[0]!.thankYouOwed.map((p) => p.id), ["new1"]);
  r = referrers(people, [touch("kev", "2026-11-12", "gift")]);
  assert.equal(r[0]!.thankYouOwed.length, 0);
});

test("templates fill in names", () => {
  const out = fillTemplate("Hi {first}, it's {me} from {business}. {name}", { name: " Jane Doe " }, { yourName: "Sam", businessName: "Acme" });
  assert.equal(out, "Hi Jane, it's Sam from Acme. Jane Doe");
});

test("csv: quotes, commas, blank lines, windows line endings", () => {
  const rows = parseCsv('﻿Name,Note\r\n"Doe, Jane","said ""hi""\nthen left"\r\n\r\nBob,ok');
  assert.deepEqual(rows, [["Name", "Note"], ["Doe, Jane", 'said "hi"\nthen left'], ["Bob", "ok"]]);
});

test("import: guesses columns, joins first and last, skips empty rows", () => {
  const rows = parseCsv("First Name,Last Name,Email Address,Mobile,What's stopping you?,Level\nJane,Doe,jane@x.com,555-1,Time,3\n,,solo@x.com,,,\n,,,,,2");
  const p = rowsToPeople(rows);
  assert.equal(p.length, 2);
  assert.deepEqual([p[0]!.name, p[0]!.email, p[0]!.phone, p[0]!.about], ["Jane Doe", "jane@x.com", "555-1", "Time"]);
  assert.equal(p[1]!.name, "solo");
});

test("export round-trips through the importer", () => {
  const csv = peopleToCsv([person("x", { name: 'Ann "AJ" Lee', email: "a@b.c", about: "line1\nline2, more" })]);
  const back = rowsToPeople(parseCsv(csv));
  assert.equal(back[0]!.name, 'Ann "AJ" Lee');
  assert.equal(back[0]!.about, "line1\nline2, more");
});

test("dates typed the way people type them are tidied", () => {
  assert.equal(tidyDay("3/14"), "03-14");
  assert.equal(tidyDay(" 12-5 "), "12-05");
  assert.equal(tidyDay("3/14/1990"), "1990-03-14");
  assert.equal(tidyDay("1990-3-4"), "1990-03-04");
  assert.equal(tidyDay("next week"), "next week");
  assert.equal(tidyDay(""), "");
});

test("addDays crosses months", () => assert.equal(addDays("2026-01-30", 3), "2026-02-02"));
