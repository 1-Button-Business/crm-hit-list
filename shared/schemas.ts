// The rulebook for what may be saved. Your own copy and the hosted site both use it.
import { z } from "zod";
import { tidyDay } from "./logic.ts";
import { TOUCH_KINDS } from "./types.ts";

export const text = (max: number) => z.string().trim().max(max);
const BAD_DAY = "Write the date like 03-14 or 3/14";
const day = z.preprocess((v) => (typeof v === "string" ? tidyDay(v) : v), z.string().regex(/^$|^(\d{4}-)?(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, BAD_DAY));
const fullDay = z.preprocess((v) => (typeof v === "string" ? tidyDay(v) : v), z.string().regex(/^$|^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, "Pick a full date, like 2026-12-01"));

export const personInput = z.object({
  name: text(200).min(1, "A name is required"),
  email: text(320),
  phone: text(60),
  company: text(200),
  address: text(500),
  birthday: day,
  dates: z.array(z.object({ label: text(80).min(1), date: day.refine((d) => d !== "", BAD_DAY) })).max(20),
  stage: text(60),
  tags: z.array(text(40).min(1)).max(30),
  referredById: text(60),
  source: text(200),
  giftIdeas: text(2000),
  about: text(10_000),
  fields: z.record(text(60), text(2000)),
  followUpOn: fullDay,
  followUpNote: text(500),
  /** Optional "known since" moment, for imports. Defaults to right now. */
  createdAt: z.string().datetime({ offset: true }),
}).partial().strict();

export const touchInput = z.object({
  personId: text(60).min(1),
  kind: z.enum(TOUCH_KINDS),
  body: z.string().trim().max(60_000, "That is too long to save. Ask Claude to shorten it first."),
  at: z.string().datetime({ offset: true }).optional(),
  source: text(40).optional(),
  ref: text(300).optional(),
  /** Set (or clear with "") the person's next follow-up in the same save. */
  followUpOn: fullDay.optional(),
}).strict();

export const settingsInput = z.object({
  businessName: text(200),
  yourName: text(200),
  quietDays: z.number("Type a number").int("Use a whole number").min(1, "Pick a number from 1 to 3650").max(3650, "Pick a number from 1 to 3650"),
  dailyGoal: z.number("Type a number").int("Use a whole number").min(1, "Pick a number from 1 to 500").max(500, "Pick a number from 1 to 500"),
  theme: text(40),
}).partial().strict();
