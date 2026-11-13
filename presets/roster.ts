import type { Preset } from "./types.ts";

/** Client Roster: coaches, trainers, wellness, meal prep, clubs. */
export const roster: Preset = {
  title: "Client Roster",
  madeFor: "Coaches, trainers, wellness practices, meal prep and clubs",
  peopleWord: "Clients",
  personWord: "client",
  stages: [
    { id: "new", label: "New lead" },
    { id: "talking", label: "Talking" },
    { id: "booked", label: "Call booked" },
    { id: "client", label: "Client" },
    { id: "past", label: "Past client" },
    { id: "nofit", label: "Not a fit", rest: true },
  ],
  firstStage: "new",
  fields: [
    { id: "package", label: "Package or membership", placeholder: "8-week program" },
    { id: "started", label: "Start date", type: "date" },
    { id: "renews", label: "Ends or renews", type: "date" },
    { id: "goals", label: "Their goals", placeholder: "What they want, in their words" },
  ],
  templates: [
    { id: "new-lead", label: "Reply to a new lead", body: "Hey {first}! Thanks for reaching out. What made you message today? I'd love to hear what you're working on." },
    { id: "book", label: "Move a chat to a call", body: "{first}, this is easier to talk through than type. Want to grab 15 minutes this week? I have time tomorrow or Thursday." },
    { id: "quiet", label: "Reconnect after a while", body: "Hey {first}, you popped into my head today. How is everything going since we last talked?" },
    { id: "renewal", label: "Package is ending", subject: "Your next step", body: "Hi {first},\n\nYour package wraps up soon and I'm proud of what you've done. Want to talk about what comes next?\n\n{me}" },
    { id: "birthday", label: "Birthday", body: "Happy birthday, {first}! Hope today is a great one." },
    { id: "referral", label: "Ask for a referral", body: "{first}, working with you has been great. Who's one person like you that I should meet?" },
  ],
  defaults: { quietDays: 21, dailyGoal: 5 },
};
