// The "Add features" menu. Each card is a message you paste into Claude.
// To add your own card, copy one block and change the words.
export type Recipe = { title: string; get: string; needs: string; prompt: string };

export const askNow: Recipe[] = [
  { title: "Who should I reach out to today?", get: "Claude reads your CRM and gives you a short list with a reason for each person.", needs: "Nothing", prompt: "Look at my CRM and tell me the 5 people I should reach out to today and why. Then write a short message for each one in my voice." },
  { title: "File this conversation", get: "Paste a DM, text thread or email. Claude finds the person, saves a note and sets the next follow-up.", needs: "Nothing", prompt: "Here is a conversation I just had. Find this person in my CRM (add them if they are new), save a short note of what we talked about, and set a follow-up date that makes sense.\n\n[paste the conversation here]" },
  { title: "Talk it in after a call", get: "Say what happened out loud. Claude logs the call and updates the person.", needs: "Nothing", prompt: "I just got off a call. Log it in my CRM, update anything that changed about this person, and set the next follow-up. Here is what happened: [say or type it]" },
  { title: "Clean up my list", get: "Claude finds doubles, missing phone numbers and people stuck in the wrong stage.", needs: "Nothing", prompt: "Go through my CRM and show me duplicates, people with no phone or email, and anyone who looks like they are in the wrong stage. Ask me before changing anything." },
];

export const builds: Recipe[] = [
  { title: "Make it match my brand", get: "Your colors, your logo, your words on every screen.", needs: "Your brand colors or your website link", prompt: "Read recipes/brand-theme.md and add a theme to my CRM that matches my brand. My website is: [link]" },
  { title: "Change what I track", get: "New stages, new boxes on each person, new ready-made messages.", needs: "Nothing", prompt: "Read CLAUDE.md, then change crm.config.ts so my stages are: [list them]. Also add these boxes to each person: [list them]." },
  { title: "Bring in my old CRM", get: "Everyone from GoHighLevel, a spreadsheet, ManyChat or a form, with notes kept.", needs: "An export file from the old tool", prompt: "Read recipes/import-old-crm.md. I have an export from [tool name] at [drag the file in]. Import everyone into my CRM and tell me what you could not match." },
  { title: "Packages and renewals", get: "A list on Today of whose package ends soon, so nobody lapses quietly.", needs: "Nothing", prompt: "Read recipes/renewals.md and add a renewals list to my Today screen." },
  { title: "Orders and reorders", get: "Order history per customer and a nudge when it is time to reorder.", needs: "Nothing", prompt: "Read recipes/orders.md and add order tracking with reorder reminders to my CRM." },
  { title: "A weekly scorecard", get: "Reach-outs and new people week by week, plus how many are in each stage.", needs: "Nothing", prompt: "Read recipes/scorecard.md and add a weekly scorecard screen to my CRM." },
  { title: "Morning briefing", get: "Each morning Claude tells you who to reach out to, whose birthday it is and what is due.", needs: "Claude desktop app", prompt: "Read recipes/morning-briefing.md and set up a morning briefing from my CRM." },
];

export const accounts: Recipe[] = [
  { title: "Send real emails from the CRM", get: "One click sends the email and logs it. Works for one person or a whole list.", needs: "A free Resend account and your own domain", prompt: "Read recipes/send-email.md and add real email sending to my CRM. Walk me through each signup step and wait for me." },
  { title: "Send real texts from the CRM", get: "Text one person or a list from your business number, and log every text sent.", needs: "A Twilio account. Texts cost a little each and the number needs approval, which takes days.", prompt: "Read recipes/send-texts.md and add real texting to my CRM. Walk me through each signup step and wait for me." },
  { title: "Use it on my phone", get: "Your CRM online behind a password, so it works from your phone anywhere.", needs: "A free Convex account and a free Cloudflare account", prompt: "Read recipes/put-it-online.md and move my CRM online so I can use it on my phone. Explain each step before you do it and keep my data safe." },
  { title: "A lead form for my website", get: "A form link for your bio. Anyone who fills it in lands in your CRM as a new lead.", needs: "Your CRM online first (the card above)", prompt: "Read recipes/lead-form.md and add a public lead form to my CRM." },
];
