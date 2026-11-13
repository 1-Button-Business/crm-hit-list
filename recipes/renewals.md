# Packages and renewals

**What the owner gets:** A card on the Today screen that lists every client whose package ends in the next 14 days, so nobody lapses quietly.

**Needs:** Nothing. No accounts. No cost. About 10 minutes. Works best with the Client Roster starting point, which already has "Start date" and "Ends or renews" boxes.

**Status:** A written plan. Not pre-built. Build it fresh in this copy and test it with the owner.

## Before you start

- If this folder is a git repo, save a checkpoint: `git add -A && git commit -m "Checkpoint before renewals"`. The `.gitignore` keeps `data/` and `.env` files out.
- If `data/crm.json` exists, copy it to `data/backups/before-renewals-YYYY-MM-DD.json` (use today's date). Tell the owner you did.
- Read `shared/logic.ts`, `shared/logic.test.ts` and `src/screens/Today.tsx` first.

## Steps

1. Check the boxes exist. Open `crm.config.ts` and the preset it uses. The roster preset in `presets/roster.ts` has fields with ids `package`, `started` and `renews`. If this copy uses another preset, add these to `config.fields` in `crm.config.ts`: `{ id: "renews", label: "Ends or renews", type: "date" }` and, if wanted, `started` and `package`. Extra boxes are saved in `person.fields`, so no change to `shared/types.ts` or `server/store.ts` is needed.
2. Check how the date is saved. Open `src/screens/PersonPage.tsx`, find where `config.fields` are drawn, and confirm that a field with `type: "date"` saves as `YYYY-MM-DD`. Read a real value with `crm_get_person` if any exist. Your rule must handle an empty box and a value that is not a date (old data may hold free text like "March").
3. Add the rule to `shared/logic.ts` as a small pure function. Suggested shape:
   - `export type Renewal = { person: Person; endsOn: string; inDays: number };`
   - `export function renewalsDue(people: Person[], today: string, within: number, restStages: string[] = []): Renewal[]`
   - For each person, read `person.fields.renews`. Skip it unless it matches `YYYY-MM-DD`.
   - `inDays = daysBetween(today, endsOn)`. Keep it when `inDays <= within`. Also keep ones that ended up to 30 days ago (`inDays >= -30`) so a missed renewal still shows, marked as ended.
   - Leave out people in rest stages, the same way `quietPeople` does.
   - Sort by `inDays`, soonest first.
   - Use the helpers already in the file (`daysBetween`). Do not use `daysUntilNext`. That one repeats every year, and a package end date is one real day.
4. Add tests in `shared/logic.test.ts`, in the same style as the tests already there. Cover: ends in 3 days is listed, ends in 15 days is not, ends today shows `inDays` 0, ended 5 days ago shows with a negative number, ended 40 days ago is gone, empty box is skipped, junk text is skipped, a rest stage is skipped, and the order is soonest first.
5. Run `npm test`. Fix until it passes.
6. Add the card to `src/screens/Today.tsx`, inside `Today()`:
   - Import `renewalsDue` from `../../shared/logic.ts`.
   - `const renewals = renewalsDue(people, today, 14, restStages);`
   - Place the card after "Follow up today" and before "Birthdays and dates this week".
   - Use the `Card` from `src/ui.tsx` with the title "Packages ending soon" and the same `rise rise-2` classes as its neighbors.
   - One `PersonRow` per renewal. The `why` line reads like "8-week program ends in 5 days" using `person.fields.package` when it is filled in, and `inDaysText(inDays)` from `src/ui.tsx`. For ended ones, say "ended 5 days ago" and add `<Chip tone="warn">Ended</Chip>`.
   - Pass `templateId="renewal"` if `config.templates` has a template with that id (the roster preset does). Then the Reach out button opens on the "Package is ending" message.
   - Only draw the card when someone in the CRM has a `renews` date at all. If some do but none are due, show an `Empty` that says "No packages end in the next 14 days." If nobody has a date yet, show nothing, or one line that tells the owner to fill in "Ends or renews" on a client's page.
7. Make Claude able to see it. In `mcp/server.ts`, add `renewalsDue` to the `crm_today` result as `packagesEnding`, with `brief(person)`, `endsOn` and `inDays`. Update the tool description to mention it.
8. If the owner wants a different window than 14 days, do not hard-code a second number. Add `renewalDays` to `Settings` in `shared/types.ts`, a default in `defaultSettings()` and a check in `settingsInput` (both in `server/store.ts`), and a `Setting` row in `src/screens/SettingsPage.tsx`. Skip this step if 14 is fine.
9. Test with real data. Use `crm_update_person` to set `fields.renews` on a test person to a date 5 days out, refresh, and see the card. Then set it back or remove the test person, with the owner's yes.
10. Run `npm run check`. Add one line to `CHANGELOG.md`.

## Ask the owner

1. "How many days ahead do you want the warning? I will use 14 unless you say otherwise."
2. "When a package ends and they renew, do you want me to move the end date forward for you when you tell me, or will you type the new date?"

## Done when

- [ ] `renewalsDue` is in `shared/logic.ts` with passing tests.
- [ ] The Today screen shows "Packages ending soon" with the right people and the right day counts.
- [ ] A person with no end date, or with junk in the box, does not break the screen.
- [ ] `crm_today` returns `packagesEnding`.
- [ ] `npm run check` passes.
- [ ] The owner has refreshed the page and seen the card with at least one real or test client.

## Do not

- Do not send a renewal message for the owner. The card only opens the Reach out box.
- Do not change anyone's end date or stage without being asked.
- Do not edit `data/crm.json` by hand. Use the CRM tools.
- Do not add a second filled main button to the Today screen.
- Do not commit `data/` or any `.env` file.
