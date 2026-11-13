import type { Preset } from "./types.ts";

/** Hit List: real estate, lending, insurance, B2B. Long cycles, referrals, relationships. */
export const hitlist: Preset = {
  title: "Hit List",
  madeFor: "Real estate, lending, insurance, consulting and anyone who lives on referrals",
  peopleWord: "People",
  personWord: "person",
  stages: [
    { id: "new", label: "New" },
    { id: "warm", label: "Warm" },
    { id: "talking", label: "In conversation" },
    { id: "deal", label: "Deal in progress" },
    { id: "closed", label: "Closed" },
    { id: "partner", label: "Referral partner" },
    { id: "nofit", label: "Not now", rest: true },
  ],
  firstStage: "new",
  fields: [
    { id: "met", label: "How we met", placeholder: "BNI, open house, LinkedIn" },
    { id: "wants", label: "What they want", placeholder: "Buying in spring, wants a duplex" },
    { id: "timeline", label: "Their timeline", placeholder: "Ready in about 3 months" },
    { id: "family", label: "Family and personal", placeholder: "Kids, pets, favorite team" },
  ],
  templates: [
    { id: "touch", label: "Stay top of mind", body: "Hey {first}, saw something today that made me think of you. How are things on your end?" },
    { id: "value", label: "Send something useful", body: "{first}, thought you'd find this useful. No need to reply, just wanted you to have it." },
    { id: "book", label: "Ask for a call", body: "{first}, want to grab 15 minutes this week? I have an idea I'd like to run by you." },
    { id: "thanks", label: "Thank a referrer", body: "{first}, thank you for sending them my way. I'll take great care of them, and I owe you one." },
    { id: "ask", label: "Ask for a referral", body: "{first}, who's one great person like you that I should connect with?" },
    { id: "birthday", label: "Birthday", body: "Happy birthday, {first}! Hope it's a great one." },
    { id: "closing", label: "Closing anniversary", subject: "One year already", body: "Hi {first},\n\nIt's been a year since we closed. Hope the place still feels like home. If you ever need anything, I'm one text away.\n\n{me}" },
  ],
  defaults: { quietDays: 45, dailyGoal: 5 },
};
