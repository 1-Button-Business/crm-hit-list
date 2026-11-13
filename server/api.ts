// The door between the screen and your data. Only your own computer can knock.
import type { IncomingMessage, ServerResponse } from "node:http";
import { ZodError } from "zod";
import { peopleToCsv } from "../shared/logic.ts";
import { NotFound } from "./store.ts";
import type { Store } from "./store.ts";

const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
const MAX_BODY = 5_000_000;

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) throw new ZodError([{ code: "custom", path: [], message: "That is too much to save at once.", input: undefined }]);
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try { return JSON.parse(raw); }
  catch { throw new ZodError([{ code: "custom", path: [], message: "That did not arrive in one piece. Try again.", input: undefined }]); }
}

/** Returns true when the request was an /api call and has been answered. */
export async function handleApi(store: Store, req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (!url.pathname.startsWith("/api/")) return false;

  // Another website open in your browser must not be able to read or change
  // your client list. Only pages served from this computer may talk to the API.
  const origin = req.headers.origin;
  if (!LOCAL.test(req.headers.host ?? "") || (origin && !LOCAL.test(origin.replace(/^https?:\/\//, "")))) {
    send(res, 403, { error: "This CRM only answers to your own computer." });
    return true;
  }
  const write = req.method !== "GET";
  if (write && !(req.headers["content-type"] ?? "").startsWith("application/json")) {
    send(res, 415, { error: "Send JSON." });
    return true;
  }

  const [, , thing, id] = url.pathname.split("/");
  const route = `${req.method} ${thing}${id ? "/:id" : ""}`;
  try {
    switch (route) {
      case "GET db": return send(res, 200, store.read()), true;
      case "GET export": {
        res.writeHead(200, { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="my-crm.csv"' });
        res.end(peopleToCsv(store.read().people));
        return true;
      }
      case "POST people": return send(res, 201, store.addPerson(await readJson(req))), true;
      case "POST import": return send(res, 201, store.importPeople(await readJson(req))), true;
      case "PATCH people/:id": return send(res, 200, store.updatePerson(id!, await readJson(req))), true;
      case "DELETE people/:id": return store.removePerson(id!), send(res, 200, { ok: true }), true;
      case "POST touches": return send(res, 201, store.addTouch(await readJson(req))), true;
      case "DELETE touches/:id": return store.removeTouch(id!), send(res, 200, { ok: true }), true;
      case "PATCH settings": return send(res, 200, store.updateSettings(await readJson(req))), true;
      default: return send(res, 404, { error: "Nothing lives at that address." }), true;
    }
  } catch (e) {
    if (e instanceof ZodError) {
      // Only pass along messages we wrote in plain words. Anything else gets a plain fallback.
      const issue = e.issues[0];
      const plain = issue && (issue.code === "custom" || issue.code === "invalid_format" || issue.code === "too_small" || issue.code === "too_big" || issue.code === "invalid_type") && !/^(Invalid|Too |Unrecognized)/.test(issue.message);
      send(res, 400, { error: plain ? issue.message : "Something in that box is not right. Check it and try again." });
    }
    else if (e instanceof NotFound) send(res, 404, { error: e.message });
    else { console.error(e); send(res, 500, { error: e instanceof Error && /backups/.test(e.message) ? e.message : "Something broke on our side and nothing was changed. Tell Claude: \"My CRM showed an error, check the terminal.\"" }); }
    return true;
  }
}
