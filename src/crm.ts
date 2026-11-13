import { createContext, useContext } from "react";
import type { Db, Person } from "../shared/types.ts";
import type { Actions } from "./api.ts";

export type Crm = {
  db: Db;
  actions: Actions;
  /** Today as "YYYY-MM-DD" on this computer. */
  today: string;
  /** Open the reach-out box for someone, optionally on a ready-made message. */
  reach: (p: Person, templateId?: string) => void;
  addPerson: () => void;
  say: (message: string, tone?: "good" | "warn") => void;
  /** Run a save and show a plain message if it fails. Returns true when it worked. */
  save: (work: Promise<unknown>, done?: string) => Promise<boolean>;
};

export const CrmContext = createContext<Crm | null>(null);
export function useCrm(): Crm {
  const c = useContext(CrmContext);
  if (!c) throw new Error("useCrm must be used inside the app");
  return c;
}
