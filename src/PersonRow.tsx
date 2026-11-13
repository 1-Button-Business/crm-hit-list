import type { ReactNode } from "react";
import { config } from "../crm.config.ts";
import type { Person } from "../shared/types.ts";
import { useCrm } from "./crm.ts";
import { Avatar, Button } from "./ui.tsx";

export const stageLabel = (id: string) => config.stages.find((s) => s.id === id)?.label ?? "No stage";

/** One line for one person: who they are, why they are on this list, one button. */
export function PersonRow({ person, why, chip, templateId, action }: { person: Person; why?: string; chip?: ReactNode; templateId?: string; action?: ReactNode }) {
  const { reach } = useCrm();
  return (
    <li className="flex flex-wrap items-center gap-3 border-t border-line py-3 first:border-t-0">
      <Avatar name={person.name} />
      <a href={`#/person/${person.id}`} className="min-w-0 flex-1 basis-40 rounded-xl hover:text-accent">
        <span className="flex flex-wrap items-center gap-2 font-semibold">{person.name}{chip}</span>
        <span className="block text-sm break-words text-soft">{why ?? stageLabel(person.stage)}</span>
      </a>
      {action ?? <Button onClick={() => reach(person, templateId)} aria-label={`Reach out to ${person.name}`}>Reach out</Button>}
    </li>
  );
}
