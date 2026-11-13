# Bring in my old CRM

**What the owner gets:** Everyone from their old tool (GoHighLevel, a spreadsheet, ManyChat, Google Forms) in this CRM, with stages and notes kept, plus a plain list of anything that did not match.

**Needs:** An export file from the old tool, usually a CSV. No accounts. No cost. About 15 minutes, longer for big or messy files.

**Status:** A written plan. Not pre-built. Build it fresh in this copy and test it with the owner.

## Before you start

- If this folder is a git repo, save a checkpoint: `git add -A && git commit -m "Checkpoint before import"`. The `.gitignore` keeps `data/` and `.env` files out.
- If `data/crm.json` exists, copy it to `data/backups/before-import-YYYY-MM-DD.json` (use today's date). Tell the owner you did. This is the undo.
- Do not copy the owner's export file into the project folder. Read it from where it is. If you must copy it, put it in `data/` so it is never committed.

## Steps

1. Read the export. Look at the header row and the first 10 rows. Count the rows. If the file is not a CSV (for example an Excel file), ask the owner to export or save it as CSV.
2. Tell the owner what you see in plain words: how many people, which columns, and which columns you plan to use.
3. Build a column map. The simple import on the Import screen uses `parseCsv` and `rowsToPeople` in `shared/logic.ts`. They guess name, email, phone, company, address, birthday, source and about. For an old CRM you usually need more, so map by hand:
   - Name. Join first and last name columns.
   - `email`, `phone`, `company`, `address`.
   - `birthday` must be `MM-DD` or `YYYY-MM-DD`. Convert other formats. If you cannot tell day from month (03/04), ask.
   - `source`: where they came from. If the old tool has none, use the tool's name, for example "GoHighLevel import".
   - `tags`: at most 30 per person, each 40 characters or less.
   - `createdAt`: if the export has a "date added" column, pass it as an ISO time with an offset. This keeps "haven't talked in a while" honest. Without it everyone looks brand new today.
   - Extra boxes: look at `config.fields` in `crm.config.ts` (through `presets/`). If an old column fits one of those ids, put it in `fields`.
4. Map stages. List the old tool's stage or status values with a count for each. List this CRM's stages from `config.stages` in `crm.config.ts`. Propose a mapping in a small table and ask the owner to confirm it. Anything you cannot map goes to `config.firstStage`. Do not invent new stages without a yes. If the owner wants a new stage, add it in `crm.config.ts` first.
5. Keep the notes. Two places:
   - A short "what to remember" summary goes in `about` (limit 10,000 characters).
   - Dated history (call notes, messages, form answers) goes in as touches of kind `note`, one per entry. The `crm_log` tool stamps the time as now. To keep the real dates, write a one-time script that calls `Store.addTouch` from `server/store.ts` with an `at` value, or put the old date at the start of the note body.
   - Old calls and emails are history. Import them as `note`, not as `call` or `email`, so they do not count toward today's reach-out goal or the streak.
6. Find doubles before you add anyone. `Store.importPeople` skips rows whose email is already in the CRM. It does not check phone or name. So also compare rows with no email against existing people by phone digits and by exact name, and compare rows inside the file against each other. Put possible doubles on a list for the owner. Do not merge by guess.
7. Pick the way in:
   - Under about 30 people: use `crm_find_people` then `crm_add_person` one at a time, then `crm_log` for notes.
   - More than that: write a one-time script in the project root (for example `import-once.ts`) that reads the file with `parseCsv`, builds the rows, and calls `new Store(dataFile()).importPeople(rows)` from `server/store.ts`. It takes up to 5,000 people per call. Run it with `node import-once.ts`. Every row passes through `personInput`, so bad rows fail loudly instead of saving junk.
8. Do a dry run first. Have the script print what it would add, skip and flag, without saving. Show the owner the counts and five sample people. Wait for a yes.
9. Run the real import. Report: added, skipped as already here, skipped as possible doubles, and rows that had no name and no email.
10. Notes need each person's new id. After `importPeople`, read the people back with `store.read()` and match by email (or by name and phone) to attach touches.
11. If a row fails the checks (name too long, bad date), fix that row or set it aside. Do not loosen the checks in `server/store.ts`.
12. Write the "did not match" report to `data/import-report.txt`: unmapped stages, columns you ignored, possible doubles, bad dates, rows skipped. Tell the owner where it is and read them the top of it.
13. Delete the one-time script when the owner is happy. Do not commit it with real names or emails inside.
14. Run `npm run check`. Add one line to `CHANGELOG.md`.

## Ask the owner

1. "Which tool is this export from, and where is the file?"
2. "Here is how I plan to match your old stages to your new ones. Is this right?" (Show the table.)
3. "These people look like they might be doubles. Which ones are the same person?" (Only if you found any.)
4. "I am ready to add N people. Go ahead?"

## Done when

- [ ] The count on the People screen went up by the number you reported as added.
- [ ] Five people picked by the owner look right: name, stage, about and notes.
- [ ] Nobody who was already in the CRM was changed or removed.
- [ ] The report in `data/import-report.txt` lists everything that did not match.
- [ ] `npm run check` passes.
- [ ] The owner has refreshed the page and seen their people.

## Do not

- Never delete or overwrite existing people. This import only adds.
- Never edit `data/crm.json` by hand. Go through the CRM tools or `Store`.
- Never commit the export file, `data/`, or a script with real client details in it.
- Do not email, text or message anyone as part of an import.
- Do not log old activity as `call`, `text`, `email`, `dm` or `meeting`. Use `note`.
- Do not guess at doubles or stages. Ask.
