# A weekly scorecard

**What the owner gets:** A Scorecard screen that shows, week by week, how many reach-outs they made, how many new people they added and how many people moved into each stage.

**Needs:** Nothing. No accounts. No cost. About 20 minutes.

**Status:** A written plan. Not pre-built. Build it fresh in this copy and test it with the owner.

## Before you start

- If this folder is a git repo, save a checkpoint: `git add -A && git commit -m "Checkpoint before scorecard"`. The `.gitignore` keeps `data/` and `.env` files out.
- If `data/crm.json` exists, copy it to `data/backups/before-scorecard-YYYY-MM-DD.json` (use today's date). Tell the owner you did. This recipe changes what gets saved, so the copy matters.
- Read `shared/types.ts`, `shared/logic.ts`, `server/store.ts` and `src/App.tsx` first.

## Steps

1. Be honest about what the CRM knows today. It can already count, for any week:
   - Reach-outs, from `db.touches` (every kind except `note`, see `isReachOut`), split by kind.
   - New people added, from each person's `createdAt`.
   - How many people sit in each stage right now.
   It cannot count "moved to Call booked this week" or "clients won this week". A stage change overwrites `person.stage` and leaves no record of when. Tell the owner this in one sentence.
2. Pick one of two paths with the owner:
   - Path A, quick: show reach-outs and new people per week, plus current totals per stage. No change to saved data.
   - Path B, full: first add a stage-change log, then show moves per week. Counts start from the day you build it. Past weeks will show a dash for stage moves, never a zero, because the answer is not known.
3. Path B only. Add the log:
   - In `shared/types.ts`, add `export type StageChange = { personId: string; from: string; to: string; at: string };` and add `stageChanges: StageChange[]` to `Db`.
   - In `server/store.ts`, `Store.read()` must return `stageChanges: raw.stageChanges ?? []` in both the "no file" case and the normal case, so old data keeps loading.
   - In `Store.updatePerson`, compare the old stage to the new one after `clean()`. When they differ, push a row with the current ISO time.
   - In `Store.addPerson` and `Store.importPeople`, push a row with `from: ""` so a person added straight into a stage is counted.
   - In `Store.removePerson`, drop that person's rows.
   - Add tests to `server/store.test.ts`: a stage change writes one row, saving the same stage writes none, old data with no `stageChanges` still loads.
   - Do not add a new touch kind for this. Every kind except `note` counts as a reach-out, so a "stage" touch would inflate the daily goal and the streak.
4. Add the rules to `shared/logic.ts` as pure functions:
   - `weekStart(day: string, startsOn: 0 | 1): string` gives the first day of that week. Ask the owner if their week starts Sunday or Monday.
   - `export type WeekScore = { weekOf: string; reachOuts: number; byKind: Record<string, number>; added: number; movedTo: Record<string, number> | null };`
   - `scorecard(db: Db, today: string, weeks: number, startsOn: 0 | 1, trackedSince?: string): WeekScore[]`, newest week first. `movedTo` is `null` for weeks before stage tracking began.
   - Use `dayOf(new Date(t.at))` to put each touch and each stage change in a week, the same way `reachOutsOn` does.
   - A person who moves into a stage, out, and back in the same week counts once for that stage.
5. Add tests in `shared/logic.test.ts`: a touch on Sunday lands in the right week for both week starts, notes are not counted, a person added this week counts once, two moves to the same stage by one person count once, a week before tracking began has `movedTo` null.
6. Run `npm test`.
7. Build the screen. Create `src/screens/Scorecard.tsx`. Use `useCrm()` for `db` and `today`, and the pieces in `src/ui.tsx`:
   - A `Card` for "This week" with large numbers: reach-outs, new people, and (Path B) one number per stage from `config.stages`, using each stage's `label`. Skip rest stages.
   - A `Card` for "Last 8 weeks" with one row per week. On a phone, stack each week as its own block. No sideways scrolling.
   - Show the weekly goal next to reach-outs: `settings.dailyGoal` times the number of days the owner works. Ask, do not assume 7.
   - Empty state when there are no touches yet: "Nothing to score yet. Log a reach-out and it shows up here."
   - Where a number is not known, show a dash and a short note: "Stage moves are counted from <date>."
   - No filled main button on this screen. It is for reading.
8. Add it to the menu. In `src/App.tsx`:
   - Import the screen and an icon from `lucide-react` (already installed).
   - Add `{ path: "scorecard", label: "Scorecard", icon: <the icon> }` to `DESTS`. Leave `main` off so it sits under More on a phone.
   - Add `scorecard: <Scorecard />` to the `screens` map inside `App()`.
9. Let Claude read it. In `mcp/server.ts`, add a `crm_scorecard` tool that returns `scorecard(...)` for the last 8 weeks, wrapped in `safe` like the others. Add its name to the tool list in `CLAUDE.md`.
10. The card in `src/recipes.ts` says "new leads, calls booked and clients won". If the owner chose Path A, change those words so the card does not promise numbers the screen does not show.
11. Run `npm run check`. Add one line to `CHANGELOG.md`.

## Ask the owner

1. "Your CRM does not keep a record of when someone changes stage. Do you want me to start keeping one, so the scorecard can show moves like 'calls booked' from today on?"
2. "Does your week start on Sunday or Monday?"
3. "How many days a week do you work your list? I use it for the weekly goal."

## Done when

- [ ] Scorecard is in the menu and opens on a wide screen and a phone-width window.
- [ ] This week's reach-outs match the count you get by hand from the history.
- [ ] Path B: moving a test person to a new stage raises that stage's number by one, and moving them back does not go negative.
- [ ] Weeks from before tracking show a dash for stage moves, not a zero.
- [ ] `npm run check` passes.
- [ ] The owner has refreshed the page and read their own week back to you.

## Do not

- Do not show a zero where the real answer is "not known".
- Do not make up past stage moves from the current stage.
- Do not add a touch kind for stage changes.
- Do not edit `data/crm.json` by hand. Old data must load without a manual fix.
- Do not commit `data/` or any `.env` file.
