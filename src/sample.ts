// Pretend people so you can try every screen before adding your real list.
// None of these are real. "Load sample people" on the Today screen adds them.
import { config } from "../crm.config.ts";
import { addDays } from "../shared/logic.ts";
import type { Person } from "../shared/types.ts";

export function samplePeople(today: string): Partial<Person>[] {
  const s = config.stages.map((x) => x.id);
  const md = (offset: number) => addDays(today, offset).slice(5);
  const since = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString();
  return [
    { name: "Maya Brooks", phone: "555-0101", email: "maya@example.com", stage: s[3] ?? s[0], source: "Referral", birthday: md(3), address: "12 Palm St, Tampa, FL 33601", giftIdeas: "Coffee sampler", about: "Two kids, trains before work. Loves pour-over coffee." },
    { name: "Derrick Cole", phone: "555-0102", stage: s[1] ?? s[0], source: "Instagram DM", followUpOn: today, followUpNote: "Send the pricing he asked about" },
    { name: "Priya Shah", email: "priya@example.com", stage: s[2] ?? s[0], source: "Networking group", followUpOn: addDays(today, -2), followUpNote: "Confirm Thursday call" },
    { name: "Tom Alvarez", phone: "555-0104", company: "Alvarez Roofing", stage: s[0], source: "Lead form", about: "Asked about getting started in January.", createdAt: since(34) },
    { name: "Renee Walsh", phone: "555-0105", email: "renee@example.com", stage: s[4] ?? s[0], source: "Past client", dates: [{ label: "Anniversary", date: md(10) }], giftIdeas: "Candle, handwritten card", createdAt: since(75) },
    { name: "Jordan Kim", email: "jordan@example.com", stage: s[1] ?? s[0], source: "Event", followUpOn: addDays(today, 90), followUpNote: "Said to circle back in 3 months" },
  ];
}
