// Talks to the little server on your computer and keeps the screen in sync.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Db, Person, Settings, Touch, TouchKind } from "../shared/types.ts";

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/${path}`, {
      method,
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new Error("Can't reach your CRM. Is the window that ran `npm start` still open?");
  }
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "That did not save. Try again.");
  return data;
}

export type Actions = {
  addPerson: (p: Partial<Person>) => Promise<Person>;
  updatePerson: (id: string, p: Partial<Person>) => Promise<Person>;
  removePerson: (id: string) => Promise<unknown>;
  addTouch: (personId: string, kind: TouchKind, body: string, followUpOn?: string) => Promise<Touch>;
  removeTouch: (id: string) => Promise<unknown>;
  updateSettings: (s: Partial<Settings>) => Promise<Settings>;
  importPeople: (rows: Partial<Person>[]) => Promise<{ added: number; skipped: number }>;
};

export function useDb() {
  const [db, setDb] = useState<Db | null>(null);
  const [error, setError] = useState("");
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try { setDb(await call<Db>("GET", "db")); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load your CRM."); }
    finally { busy.current = false; }
  }, []);

  useEffect(() => {
    void refresh();
    // Re-check every few seconds so changes Claude makes show up on their own.
    const timer = setInterval(() => { if (!document.hidden) void refresh(); }, 5000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [refresh]);

  const then = async <T,>(p: Promise<T>) => { const out = await p; await refresh(); return out; };
  const actions: Actions = {
    addPerson: (p) => then(call("POST", "people", p)),
    updatePerson: (id, p) => then(call("PATCH", `people/${id}`, p)),
    removePerson: (id) => then(call("DELETE", `people/${id}`, {})),
    addTouch: (personId, kind, body, followUpOn) => then(call("POST", "touches", { personId, kind, body, followUpOn })),
    removeTouch: (id) => then(call("DELETE", `touches/${id}`, {})),
    updateSettings: (s) => then(call("PATCH", "settings", s)),
    importPeople: (rows) => then(call("POST", "import", rows)),
  };
  return { db, error, refresh, actions };
}
