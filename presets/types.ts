export type Stage = { id: string; label: string; /** true = leave them out of "haven't talked in a while" */ rest?: boolean };
export type Field = { id: string; label: string; type?: "text" | "date"; placeholder?: string };
export type Template = { id: string; label: string; subject?: string; body: string };

export type Preset = {
  /** Shown in the README and the setup screen. */
  title: string;
  madeFor: string;
  /** What you call the people in here: "Clients", "People", "Customers". */
  peopleWord: string;
  personWord: string;
  stages: Stage[];
  /** Stage a brand-new person lands in. */
  firstStage: string;
  /** Extra boxes on each person's page. */
  fields: Field[];
  /** Ready-to-send messages. {first} {name} {me} {business} get filled in. */
  templates: Template[];
  defaults: { quietDays: number; dailyGoal: number };
};
