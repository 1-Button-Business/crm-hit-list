import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";
import { INSTRUCTIONS, TOOLS, sha256 } from "./claude";

const http = httpRouter();
auth.addHttpRoutes(http);

// The member's private connector link: /mcp/<their key>. Claude speaks MCP over plain HTTP POST.
// ponytail: stateless, JSON replies only (no streaming). Add OAuth if Anthropic stops accepting key links.
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const rpcError = (id: unknown, code: number, message: string) => json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
const VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];

const mcp = httpAction(async (ctx, req) => {
  if (req.method !== "POST") return new Response("Use POST.", { status: 405, headers: { allow: "POST" } });
  const fromPath = new URL(req.url).pathname.split("/")[2] ?? "";
  const fromHeader = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const key = fromPath || fromHeader;
  if (!/^crm_[0-9a-f]{48}$/.test(key)) return json({ error: "Missing or broken link. Copy it again from Settings at crm.1buttonbusiness.com." }, 401);
  const hash = await sha256(key);

  let msg: { id?: unknown; method?: string; params?: Record<string, unknown> };
  try { msg = await req.json(); } catch { return rpcError(null, -32700, "That was not valid JSON."); }
  if (Array.isArray(msg)) return rpcError(null, -32600, "Send one message at a time.");
  const { id, method, params = {} } = msg;
  if (id === undefined) return new Response(null, { status: 202 }); // notifications need no reply

  const run = (tool: string, args: unknown) => ctx.runMutation(internal.claude.call, { hash, tool, args });
  switch (method) {
    case "initialize": {
      const check = await run("__auth", {});
      if (!check.ok) return json({ error: check.error }, 401);
      const asked = String(params.protocolVersion ?? "");
      return json({ jsonrpc: "2.0", id, result: {
        protocolVersion: VERSIONS.includes(asked) ? asked : VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "1bb-crm", title: "1BB CRM", version: "1.0.0" },
        instructions: INSTRUCTIONS,
      } });
    }
    case "ping": return json({ jsonrpc: "2.0", id, result: {} });
    case "tools/list": return json({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
    case "tools/call": {
      const name = String(params.name ?? "");
      if (!TOOLS.some((t) => t.name === name)) return rpcError(id, -32602, `There is no tool called ${name}.`);
      const out = await run(name, params.arguments ?? {});
      if (!out.ok && out.auth) return json({ error: out.error }, 401);
      const text = out.ok ? JSON.stringify(out.result) : out.error;
      return json({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text }], isError: !out.ok } });
    }
    default: return rpcError(id, -32601, `Not supported: ${method}`);
  }
});

for (const method of ["POST", "GET", "DELETE"] as const) {
  http.route({ pathPrefix: "/mcp/", method, handler: mcp });
  http.route({ path: "/mcp", method, handler: mcp });
}
export default http;
