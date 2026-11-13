import type { Preset } from "./types.ts";

/** Gift Book: repeat customers, corporate orders, catering, gifting. */
export const giftbook: Preset = {
  title: "Gift Book",
  madeFor: "Product, catering and gifting businesses with repeat and corporate customers",
  peopleWord: "Customers",
  personWord: "customer",
  stages: [
    { id: "new", label: "New lead" },
    { id: "quoted", label: "Quoted" },
    { id: "verbal", label: "Verbal yes" },
    { id: "ordered", label: "Ordered" },
    { id: "repeat", label: "Repeat customer" },
    { id: "nofit", label: "Not now", rest: true },
  ],
  firstStage: "new",
  fields: [
    { id: "usual", label: "Usual order", placeholder: "20 gift boxes each December" },
    { id: "recipients", label: "Who the gifts go to", placeholder: "Staff of 19, top 5 clients" },
    { id: "reorder", label: "Next reorder date", type: "date" },
    { id: "delivery", label: "Delivery notes", placeholder: "Front desk, before noon" },
  ],
  templates: [
    { id: "quote", label: "Follow up on a quote", body: "Hi {first}, wanted to make sure you got the quote. Any questions I can answer before you decide?" },
    { id: "verbal", label: "Lock in a verbal yes", body: "{first}, excited to do this with you. To hold your spot I just need a headcount and a delivery date. Can you send those over?" },
    { id: "reorder", label: "Time to reorder", body: "Hey {first}, it's about that time again. Want me to set up the same order as last time?" },
    { id: "season", label: "Holiday heads-up", subject: "Holiday orders are opening", body: "Hi {first},\n\nHoliday orders are opening and I wanted you to have first pick. Want me to save your usual?\n\n{me}\n{business}" },
    { id: "thanks", label: "Thank you after an order", body: "{first}, thank you for the order. It means a lot. Let me know how everyone likes it." },
    { id: "referral", label: "Ask for a referral", body: "{first}, who else do you know that takes care of their people the way you do?" },
  ],
  defaults: { quietDays: 60, dailyGoal: 3 },
};
