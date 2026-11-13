// The shape of everything the CRM stores. One file so Claude (and you) can see it all.

export const TOUCH_KINDS = ["note", "call", "text", "email", "dm", "meeting", "gift", "order"] as const;
export type TouchKind = (typeof TOUCH_KINDS)[number];

/** A person in your CRM: a lead, a client, a past client, a referral partner. */
export type Person = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  /** "MM-DD" or "YYYY-MM-DD". */
  birthday: string;
  /** Other dates worth remembering: anniversary, closing date, renewal. */
  dates: { label: string; date: string }[];
  /** One of the stage ids in crm.config.ts. */
  stage: string;
  tags: string[];
  /** id of the person who sent them to you. */
  referredById: string;
  /** Where they came from: "Instagram DM", "BNI", "Lead form". */
  source: string;
  giftIdeas: string;
  /** The pinned "what to remember about them" note. */
  about: string;
  /** Extra fields from crm.config.ts (package, goals, and so on). */
  fields: Record<string, string>;
  /** "YYYY-MM-DD" day to reach out next. Empty means none. */
  followUpOn: string;
  followUpNote: string;
  createdAt: string;
};

/** One thing that happened with a person: a note, a call, a gift. */
export type Touch = {
  id: string;
  personId: string;
  kind: TouchKind;
  body: string;
  /** ISO timestamp. */
  at: string;
  /** Where it came from when a connection brought it in: one of SOURCES. Empty when you typed it. */
  source?: string;
  /** The outside id (a calendar event, a recording). Stops the same thing being saved twice. */
  ref?: string;
};

/** The places conversations can come in from. Add one here and it shows on the Connections screen. */
export const SOURCES = { calendar: "Calendar", recorder: "Call recorder", texts: "Text messages", email: "Email" } as const;
export type Source = keyof typeof SOURCES;

export type Settings = {
  businessName: string;
  yourName: string;
  /** Days without contact before someone shows as "haven't talked in a while". */
  quietDays: number;
  /** Reach-outs you want to make each day. */
  dailyGoal: number;
  theme: string;
};

export type Db = { people: Person[]; touches: Touch[]; settings: Settings };

export const emptyPerson = (): Omit<Person, "id" | "createdAt"> => ({
  name: "", email: "", phone: "", company: "", address: "", birthday: "", dates: [],
  stage: "", tags: [], referredById: "", source: "", giftIdeas: "", about: "",
  fields: {}, followUpOn: "", followUpNote: "",
});
