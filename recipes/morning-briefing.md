# Morning briefing

**What the owner gets:** Each morning, a short list from Claude: who to reach out to today, whose birthday is coming and which follow-ups are due.

**Needs:** The Claude desktop app, open on this computer, with this CRM folder chosen. The computer must be on and awake at briefing time. No other accounts. No extra cost.

**Status:** A written plan. Not pre-built. Build it fresh in this copy and test it with the owner.

## Before you start

- This recipe changes no app code and no saved data. A checkpoint is still a good habit: if this folder is a git repo, run `git add -A && git commit -m "Checkpoint before morning briefing"`. The `.gitignore` keeps `data/` and `.env` files out.
- If `data/crm.json` exists, copy it to `data/backups/before-morning-briefing-YYYY-MM-DD.json` (use today's date).
- Check the CRM tools work. Call `crm_today`. If the tool is missing, the owner opened Claude in the wrong folder. Ask them to open the folder that holds `CLAUDE.md` and `.mcp.json`.

## Steps

1. Run `crm_today` once and look at what comes back: `followUpsDue`, `datesThisWeek`, `goneQuiet`, `thankYousOwed`, `reachOutsToday`, `dailyGoal` and `streakDays`. The briefing is built from these. No new tool is needed.
2. Write the briefing by hand first, right now, so the owner can react to it. Use this shape and keep it short enough to read on a phone:
   - One line: "Good morning. Your goal is N reach-outs today. You are on a D day streak." Leave the streak out when it is zero.
   - "Follow up today": each person in `followUpsDue` with their note. Late ones first.
   - "Birthdays and dates": each item in `datesThisWeek` with "today", "tomorrow" or "in N days".
   - "Thank-yous you owe": each referrer in `thankYousOwed` and who they sent.
   - "Haven't talked in a while": the top 3 to 5 from `goneQuiet`, not all 25.
   - A closing line that picks the first person to start with and why.
   - If every list is empty, say so in one line. Do not pad it.
3. Ask the owner if they want a draft message with each name. If yes, use `crm_get_person` for the people on the list so the draft is based on their real notes, and write in the owner's voice. Use the templates in `crm.config.ts` as a starting point. Drafts only.
4. Show the owner the sample and adjust the order, length and tone until they like it.
5. Save the final instructions as a reusable prompt. Keep it as plain text you can hand to a scheduler or to the owner. It should say: read `crm_today`, write the briefing in the agreed shape, draft messages if the owner wanted them, send nothing, change nothing.
6. Now check what scheduling tools you really have in this session. Look at your own tool list for anything that creates scheduled or recurring tasks. Do not assume. Tools differ by app version and plan.
7. If you have a scheduling tool:
   - Read that tool's own description for how it sets the time and the working folder. Read the current official Claude docs on scheduled tasks if anything is unclear.
   - Create one task that runs every morning at the time the owner picked, in their local time, with the prompt from step 5.
   - The task must run with this CRM folder as its working folder. That is what loads `.mcp.json` and gives the run the `crm_today` tool. If the tool cannot set a folder, say so and use step 8.
   - Tell the owner the plain truth: it only runs when the computer is on, awake and the Claude app is open. A closed laptop means no briefing.
   - Run the task once by hand, if the tool allows it, and read the result with the owner.
   - List the scheduled tasks and confirm there is exactly one. Delete any duplicates you made while testing.
8. If you have no scheduling tool, or the test run could not reach the CRM tools, do not fake it. Give the owner this one line to paste into Claude each morning, with this folder open:

   `Give me my morning briefing from my CRM.`

   Then add a short section to `CLAUDE.md` titled "Morning briefing" that holds the agreed shape from step 5, so that one line always produces the same briefing.
9. Either way, add that "Morning briefing" section to `CLAUDE.md`. A scheduled run and a pasted line should give the same result.
10. Optional. If the owner wants the briefing somewhere other than the Claude app (a text, an email), stop. That means sending a message, which needs `recipes/send-email.md` or `recipes/send-texts.md` first and a clear yes from the owner for a daily message to themselves.
11. Tell the owner how to change or stop it: "Change my morning briefing to 7am" or "Stop my morning briefing." If you made a scheduled task, tell them where it shows in the app.
12. Add one line to `CHANGELOG.md`. `npm run check` should still pass, since no code changed. Run it to be sure.

## Ask the owner

1. "What time do you want your briefing, and on which days?"
2. "Do you want a draft message with each name, or only the list?"
3. "Is your computer usually on and open at that time? If not, I will give you one line to paste when you sit down."

## Done when

- [ ] The owner has read one real briefing built from their own CRM and said the shape is right.
- [ ] Either one scheduled task exists and a test run worked, or the owner has the one line to paste and has tried it.
- [ ] `CLAUDE.md` has a "Morning briefing" section with the agreed shape.
- [ ] The owner knows it needs the computer on and the Claude app open.
- [ ] `npm run check` passes.

## Do not

- Do not send any message to any client. The briefing drafts. The owner sends.
- Do not change people, stages or follow-up dates during a briefing run.
- Do not claim it is scheduled unless you created the task and saw a test run work.
- Do not put client names or details into any outside service to schedule this.
- Do not create more than one scheduled task for the same briefing.
- Do not commit `data/` or any `.env` file.
