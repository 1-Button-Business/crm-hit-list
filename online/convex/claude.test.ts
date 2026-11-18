// The Claude connector: a key reaches one member's CRM and nothing else.
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api, internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function setup() {
  const t = convexTest(schema, modules);
  const make = async (email: string) => {
    const id = await t.run((ctx) => ctx.db.insert("users", { email }));
    return { id, as: t.withIdentity({ subject: `${id}|session` }) };
  };
  await t.mutation(internal.members.add, { emails: ["a@example.com", "b@example.com"] });
  const a = await make("a@example.com"), b = await make("b@example.com");
  const keyA = (await a.as.mutation(api.claude.makeKey, { label: "Claude" })).key;
  const keyB = (await b.as.mutation(api.claude.makeKey, { label: "Claude" })).key;
  let n = 0;
  const rpc = async (key: string, method: string, params: object = {}) => {
    const res = await t.fetch(`/mcp/${key}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: ++n, method, params }) });
    return { status: res.status, body: await res.json() as { result?: { content?: { text: string }[]; isError?: boolean; tools?: { name: string }[]; instructions?: string }; error?: unknown } };
  };
  const tool = async (key: string, name: string, args: object = {}) => {
    const r = await rpc(key, "tools/call", { name, arguments: args });
    const c = r.body.result!;
    return { isError: !!c.isError, text: c.content![0]!.text, data: c.isError ? null : JSON.parse(c.content![0]!.text) };
  };
  return { t, a, b, keyA, keyB, rpc, tool };
}

describe("Claude connector", () => {
  test("handshake and tool list work with a real key, and refuse a fake one", async () => {
    const { rpc, keyA } = await setup();
    const init = await rpc(keyA, "initialize", { protocolVersion: "2025-06-18" });
    expect(init.status).toBe(200);
    expect(init.body.result?.instructions).toContain("1BB CRM");
    const list = await rpc(keyA, "tools/list");
    expect(list.body.result?.tools?.map((x) => x.name)).toContain("add_people");
    expect((await rpc("crm_" + "0".repeat(48), "initialize")).status).toBe(401);
    expect((await rpc("nonsense", "tools/list")).status).toBe(401);
  });

  test("a key only ever sees its own member", async () => {
    const { tool, keyA, keyB, b } = await setup();
    const added = await tool(keyA, "add_people", { people: [{ name: "Ana Lopez", email: "ana@x.com" }, { name: "Dup", email: "ANA@x.com" }] });
    expect(added.data).toEqual({ added: 1, skipped: 1 });
    const found = await tool(keyA, "find_people", { search: "ana" });
    expect(found.data.total).toBe(1);
    expect((await tool(keyB, "find_people", {})).data.total).toBe(0);
    const id = found.data.people[0].id;
    expect((await tool(keyB, "get_person", { id })).isError).toBe(true);
    expect((await tool(keyB, "update_person", { id, changes: { name: "Hacked" } })).isError).toBe(true);
    expect((await b.as.query(api.crm.db, {})).people).toHaveLength(0);
  });

  test("conversations, setup, fields, processes and dashboard cards", async () => {
    const { tool, keyA, a } = await setup();
    const id = (await tool(keyA, "add_people", { people: [{ name: "Ben" }] })) && (await tool(keyA, "find_people", {})).data.people[0].id;
    const logged = await tool(keyA, "log_conversations", { items: [{ personId: id, kind: "text", body: "Asked about pricing", ref: "msg-1", source: "texts" }, { personId: id, kind: "text", body: "same", ref: "msg-1" }] });
    expect(logged.data).toEqual({ added: 1, skipped: 1 });
    expect((await tool(keyA, "get_person", { id })).data.history).toHaveLength(1);
    expect((await tool(keyA, "setup_step", { step: "basics", status: "done" })).data.next).toBe("type");
    expect((await tool(keyA, "set_custom_fields", { fields: [{ id: "Bad Id", label: "x" }] })).isError).toBe(true);
    await tool(keyA, "set_custom_fields", { fields: [{ id: "contract_end", label: "Contract end" }] });
    await tool(keyA, "save_process", { name: "New lead", steps: "Text within an hour" });
    await tool(keyA, "save_dashboard_card", { title: "Paid this month", value: "$1,200", source: "Stripe" });
    await tool(keyA, "save_dashboard_card", { title: "paid this month", value: "$1,500", source: "Stripe" });
    expect((await tool(keyA, "save_dashboard_card", { title: "x", value: "1", source: "y", link: "javascript:alert(1)" })).isError).toBe(true);
    const o = (await tool(keyA, "crm_overview", { today: "2026-11-18" })).data;
    expect(o.custom_fields).toEqual([{ id: "contract_end", label: "Contract end" }]);
    expect(o.processes[0].name).toBe("New lead");
    expect(o.dashboard).toHaveLength(1);
    expect(o.dashboard[0].value).toBe("$1,500");
    expect((await a.as.query(api.crm.db, {})).settings.customFields).toHaveLength(1);
  });

  test("deleting a person needs their exact name", async () => {
    const { tool, keyA } = await setup();
    await tool(keyA, "add_people", { people: [{ name: "Cara" }] });
    const id = (await tool(keyA, "find_people", {})).data.people[0].id;
    expect((await tool(keyA, "delete_person", { id, confirm_name: "Someone" })).isError).toBe(true);
    expect((await tool(keyA, "delete_person", { id, confirm_name: "cara" })).data).toEqual({ ok: true });
  });

  test("a removed key or a removed member stops working", async () => {
    const { t, a, rpc, keyA, keyB } = await setup();
    const [k] = await a.as.query(api.claude.keys, {});
    await a.as.mutation(api.claude.removeKey, { id: k!.id });
    expect((await rpc(keyA, "initialize")).status).toBe(401);
    await t.mutation(internal.members.remove, { email: "b@example.com" });
    expect((await rpc(keyB, "tools/list")).status).toBe(200); // the list itself is public
    expect((await rpc(keyB, "tools/call", { name: "crm_overview", arguments: {} })).status).toBe(401);
  });
});

describe("cleanup and notes", () => {
  test("deleting the account also removes links, notes and cards", async () => {
    const { t, a, tool, keyA, rpc } = await setup();
    await tool(keyA, "save_process", { name: "New lead", steps: "Text within an hour" });
    await tool(keyA, "save_dashboard_card", { title: "Paid", value: "$1", source: "Stripe" });
    await a.as.mutation(api.crm.deleteAccount, {});
    const left = await t.run(async (ctx) => [
      ...(await ctx.db.query("claudeKeys").collect()), ...(await ctx.db.query("processes").collect()), ...(await ctx.db.query("dashCards").collect()),
    ].filter((r) => r.userId === a.id));
    expect(left).toHaveLength(0);
    expect((await rpc(keyA, "initialize")).status).toBe(401);
  });

  test("processes are notes the member can see and remove, and only their own", async () => {
    const { a, b, tool, keyA } = await setup();
    await tool(keyA, "save_process", { name: "New lead", steps: "Text within an hour" });
    const [n] = await a.as.query(api.claude.processes, {});
    expect(n!.name).toBe("New lead");
    await expect(b.as.mutation(api.claude.removeProcess, { id: n!.id })).rejects.toThrow("already gone");
    await a.as.mutation(api.claude.removeProcess, { id: n!.id });
    expect(await a.as.query(api.claude.processes, {})).toHaveLength(0);
  });
});

describe("admin view", () => {
  test("only admins can see the member list and open a member's CRM", async () => {
    process.env.ADMIN_EMAILS = "b@example.com";
    const { a, b, tool, keyA } = await setup();
    await tool(keyA, "add_people", { people: [{ name: "Private Person" }] });
    await expect(a.as.query(api.admin.members, {})).rejects.toThrow("Admins only.");
    const rows = await b.as.query(api.admin.members, {});
    const rowA = rows.find((r) => r.email === "a@example.com")!;
    expect(rowA).toMatchObject({ joined: true, people: 1, claude: true });
    await expect(a.as.query(api.admin.memberCrm, { email: "b@example.com" })).rejects.toThrow("Admins only.");
    expect((await b.as.query(api.admin.memberCrm, { email: "a@example.com" })).people[0]!.name).toBe("Private Person");
    delete process.env.ADMIN_EMAILS;
  });
});
