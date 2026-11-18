// Turns the CRM's requests into calls to the hosted database.
// The CRM screens do not know or care which backend they are talking to.
import type { ConvexReactClient } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../convex/_generated/api";

/** Drop undefined fields. The database refuses them. */
const tidy = <T,>(x: T): T => JSON.parse(JSON.stringify(x ?? {})) as T;

export function makeBackend(client: ConvexReactClient) {
  return async function hosted<T>(method: string, path: string, body?: unknown): Promise<T> {
    const [thing, id = ""] = path.split("/");
    const b = tidy(body) as never;
    try {
      switch (`${method} ${thing}${id ? "/:id" : ""}`) {
        case "GET db": return (await client.query(api.crm.db, {})) as T;
        case "POST people": return (await client.mutation(api.crm.addPerson, { person: b })) as T;
        case "POST import": return (await client.mutation(api.crm.importPeople, { rows: b })) as T;
        case "PATCH people/:id": return (await client.mutation(api.crm.updatePerson, { id, changes: b })) as T;
        case "DELETE people/:id": return (await client.mutation(api.crm.removePerson, { id })) as T;
        case "POST touches": return (await client.mutation(api.crm.addTouch, { touch: b })) as T;
        case "POST conversations": return (await client.mutation(api.crm.importTouches, { rows: b })) as T;
        case "DELETE touches/:id": return (await client.mutation(api.crm.removeTouch, { id })) as T;
        case "PATCH settings": return (await client.mutation(api.crm.updateSettings, { settings: b })) as T;
        default: throw new ConvexError("Nothing lives at that address.");
      }
    } catch (e) {
      throw new Error(e instanceof ConvexError && typeof e.data === "string" ? e.data : "That did not go through. Check your internet and try again.");
    }
  };
}
