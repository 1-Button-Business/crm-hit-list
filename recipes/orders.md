# Orders and reorders

**What the owner gets:** An order history on each customer's page and a card on Today that says who is due to reorder.

**Needs:** Nothing. No accounts. No cost. About 15 minutes. Works best with the Gift Book starting point, which already has a "Next reorder date" box.

**Status:** A written plan. Not pre-built. Build it fresh in this copy and test it with the owner.

## Before you start

- If this folder is a git repo, save a checkpoint: `git add -A && git commit -m "Checkpoint before orders"`. The `.gitignore` keeps `data/` and `.env` files out.
- If `data/crm.json` exists, copy it to `data/backups/before-orders-YYYY-MM-DD.json` (use today's date). Tell the owner you did.
- Read `shared/types.ts`, `shared/logic.ts`, `src/screens/PersonPage.tsx` and `src/screens/Today.tsx` first.

## Steps

1. Know what is already here. `TOUCH_KINDS` in `shared/types.ts` already includes `order`. The log box on `src/screens/PersonPage.tsx` already lets the owner pick "Order" and type what was bought. The `crm_log` tool accepts kind `order`. So an order is a touch with `kind: "order"` and the details in `body`. Do not add a new table.
2. Know one side effect. `isReachOut` in `shared/logic.ts` counts every kind except `note`. So logging an order counts toward the daily goal and resets "haven't talked in a while". Tell the owner. If they do not want that, change `isReachOut` to leave out `order` (and `gift` if they say so), then update the tests in `shared/logic.test.ts` and the words on the Today screen that list what counts.
3. Decide the reorder rule with the owner. Two sources, in this order:
   - A date the owner typed in the `reorder` box (`person.fields.reorder`, `YYYY-MM-DD`). This wins when it is filled in.
   - Otherwise, the day of their last order plus N days.
4. Make N a setting. Add `reorderDays: number` to `Settings` in `shared/types.ts`. Add a default to `defaultSettings()` and a check to `settingsInput` in `server/store.ts` (a whole number from 1 to 3650, like `quietDays`). Old data must still load, which `Store.read()` already handles by spreading the defaults. Add a `Setting` row to `src/screens/SettingsPage.tsx` with the label "Reorder after this many days".
5. If this copy does not use the giftbook preset, add the box in `crm.config.ts`: `{ id: "reorder", label: "Next reorder date", type: "date" }`.
6. Add the rules to `shared/logic.ts` as small pure functions:
   - `lastOrderByPerson(touches: Touch[]): Map<string, string>` gives the day of each person's newest `order` touch. Copy the shape of `lastReachOutByPerson`.
   - `export type Reorder = { person: Person; dueOn: string; inDays: number; from: "date" | "last-order" };`
   - `reordersDue(people, touches, today, within, reorderDays, restStages = []): Reorder[]`. For each person, `dueOn` is `fields.reorder` when it is a real `YYYY-MM-DD`, else `addDays(lastOrderDay, reorderDays)`, else skip them. Keep when `daysBetween(today, dueOn) <= within`. Sort soonest first. Leave out rest stages.
   - People who have never ordered and have no reorder date are not on the list.
7. Add tests in `shared/logic.test.ts`. Cover: typed date wins over last order, last order plus N days works, no orders and no date is skipped, overdue shows a negative number, outside the window is skipped, junk in the box falls back to last order, newest order is the one used, rest stage is skipped.
8. Run `npm test`.
9. Order history on the person's page. In `src/screens/PersonPage.tsx`, above the full history, add a small `Card` titled "Orders" that lists that person's `order` touches newest first: date and what they ordered. Show the count and the date of the last one. Empty state: "No orders yet. Log one below and pick Order."
10. Reorder card on Today. In `src/screens/Today.tsx`, add a `Card` titled "Time to reorder" after "Follow up today". Use `reordersDue(people, touches, today, 14, settings.reorderDays, restStages)`. One `PersonRow` each. The `why` line reads like "Usually reorders about now. Last order 58 days ago." or "Reorder date is in 3 days", plus `person.fields.usual` when it is filled in. Pass `templateId="reorder"` when `config.templates` has that id (the giftbook preset does). Only draw the card when at least one person has an order or a reorder date.
11. Clear the date when they order. When an `order` touch is logged for someone whose `fields.reorder` is today or in the past, clear `fields.reorder` so the "last order plus N days" rule takes over. Do this in the place that logs the touch on `PersonPage.tsx` using `actions.updatePerson`, and remember that `fields` is saved whole, so send the full `fields` object with that one key changed. Tell the owner this happens.
12. Let Claude see it. In `mcp/server.ts`, add `reordersDue` to the `crm_today` result as `reordersDue`, and mention it in the description.
13. Optional, only if asked: an order amount. The body is free text today. If the owner wants totals, ask them how they write amounts, and add a helper that reads a leading dollar amount from the body. Do not add a money field to `Touch` unless they need real reports.
14. Test with the owner: log an order on a test customer with `crm_log`, set a reorder date 3 days out with `crm_update_person`, refresh, and see both cards.
15. Run `npm run check`. Add one line to `CHANGELOG.md`.

## Ask the owner

1. "How many days after an order do most customers reorder? I will use that when someone has no reorder date."
2. "Should logging an order count as a reach-out toward your daily goal? Right now it does."
3. "How many days ahead do you want the reorder reminder? I will use 14 unless you say otherwise."

## Done when

- [ ] A person's page shows their orders, newest first.
- [ ] Today shows "Time to reorder" with the right people for both rules.
- [ ] `lastOrderByPerson` and `reordersDue` have passing tests.
- [ ] The new setting saves on the Settings screen and old data still loads.
- [ ] `npm run check` passes.
- [ ] The owner has refreshed the page, logged a test order and seen it show up.

## Do not

- Do not message customers for the owner. The card only opens the Reach out box.
- Do not take payments or store card numbers. This tracks orders. It does not sell.
- Do not edit `data/crm.json` by hand. Use the CRM tools.
- Do not delete old `order` touches when changing how they are shown.
- Do not commit `data/` or any `.env` file.
