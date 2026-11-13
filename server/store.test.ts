import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handleApi } from "./api.ts";
import { Store } from "./store.ts";

const fresh = () => new Store(join(mkdtempSync(join(tmpdir(), "crm-")), "crm.json"));

test("add, update, note, remove a person; removing cleans up after itself", () => {
  const s = fresh();
  const a = s.addPerson({ name: "  Jane Doe ", email: "j@x.com" });
  assert.equal(a.name, "Jane Doe");
  assert.equal(a.stage, "new");
  const b = s.addPerson({ name: "Bob", referredById: a.id, stage: "not-a-stage" });
  assert.equal(b.stage, "new");
  s.updatePerson(a.id, { followUpOn: "2026-12-01", referredById: a.id });
  s.addTouch({ personId: a.id, kind: "call", body: "Great chat" });
  s.removePerson(a.id);
  const db = s.read();
  assert.equal(db.people.length, 1);
  assert.equal(db.touches.length, 0);
  assert.equal(db.people[0]!.referredById, "");
});

test("bad input is refused and nothing is saved", () => {
  const s = fresh();
  assert.throws(() => s.addPerson({ name: "" }));
  assert.throws(() => s.addPerson({ name: "x", hacker: true }));
  assert.throws(() => s.addPerson({ name: "x", birthday: "tomorrow" }));
  assert.throws(() => s.addTouch({ personId: "nobody", kind: "call", body: "" }));
  assert.throws(() => s.updateSettings({ quietDays: -5 }), /Pick a number/);
  assert.throws(() => s.updateSettings({ dailyGoal: 0 }));
  assert.throws(() => s.addPerson({ name: "x", birthday: "13-40" }), /Write the date/);
  assert.equal(s.read().people.length, 0);
});

test("dates are tidied on the way in, and a reach-out can set the follow-up in one save", () => {
  const s = fresh();
  const a = s.addPerson({ name: "Jane", birthday: "3/14", followUpOn: "2026-11-01" });
  assert.equal(a.birthday, "03-14");
  s.addTouch({ personId: a.id, kind: "call", body: "", followUpOn: "2026-12-01" });
  assert.equal(s.read().people[0]!.followUpOn, "2026-12-01");
  s.addTouch({ personId: a.id, kind: "call", body: "", followUpOn: "" });
  assert.equal(s.read().people[0]!.followUpOn, "");
  s.addTouch({ personId: a.id, kind: "note", body: "x" });
  assert.equal(s.read().touches.length, 3);
});

test("import skips people whose email is already there", () => {
  const s = fresh();
  s.addPerson({ name: "Jane", email: "J@x.com" });
  const r = s.importPeople([{ name: "Jane again", email: "j@X.com" }, { name: "New", email: "n@x.com" }, { name: "Twin", email: "n@x.com" }, { name: "No email" }]);
  assert.deepEqual(r, { added: 2, skipped: 2 });
});

test("a daily backup is kept before the first change of the day", () => {
  const s = fresh();
  s.addPerson({ name: "One" });
  s.addPerson({ name: "Two" });
  assert.equal(readdirSync(join(s.file, "..", "backups")).length, 1);
});

test("a damaged file gives a plain-English error instead of wiping data", () => {
  const s = fresh();
  writeFileSync(s.file, "{ not json");
  assert.throws(() => s.read(), /backups/);
});

test("the API only answers to this computer", async () => {
  const s = fresh();
  const server = createServer((req, res) => void handleApi(s, req, res));
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const json = { "content-type": "application/json" };
  try {
    assert.equal((await fetch(`${base}/api/db`)).status, 200);
    // a page on another site trying to read or write your list
    assert.equal((await fetch(`${base}/api/db`, { headers: { origin: "https://evil.example" } })).status, 403);
    assert.equal((await fetch(`${base}/api/people`, { method: "POST", headers: { ...json, origin: "https://evil.example" }, body: '{"name":"x"}' })).status, 403);
    // a plain HTML form post (no JSON header) is refused
    assert.equal((await fetch(`${base}/api/people`, { method: "POST", body: '{"name":"x"}' })).status, 415);
    assert.equal((await fetch(`${base}/api/people`, { method: "POST", headers: json, body: '{"name":""}' })).status, 400);
    assert.equal((await fetch(`${base}/api/people/nope`, { method: "PATCH", headers: json, body: "{}" })).status, 404);
    assert.equal((await fetch(`${base}/api/people`, { method: "POST", headers: json, body: '{"name":"Ok"}' })).status, 201);
    assert.equal(s.read().people.length, 1);
  } finally { server.close(); }
});

test("a connection can run twice without saving doubles", () => {
  const store = fresh();
  const p = store.addPerson({ name: "Jane Doe" });
  const row = { personId: p.id, kind: "meeting", body: "Intro call", at: "2026-11-05T15:00:00.000Z", source: "calendar", ref: "cal:a1" };
  assert.deepEqual(store.importTouches([row, row, { ...row, personId: "nobody" }]), { added: 1, skipped: 2 });
  assert.deepEqual(store.importTouches([row]), { added: 0, skipped: 1 });
  assert.equal(store.addTouch(row).id, store.read().touches[0]!.id);
  assert.equal(store.read().touches.length, 1);
  assert.equal(store.read().touches[0]!.source, "calendar");
});
