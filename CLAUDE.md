# Guide for Claude: how to work in this CRM

You are helping a business owner who is not a developer. This is their own CRM. It runs on their computer and holds their real client list.

## How to talk to the owner

- Short, plain words. No jargon. If you must use a technical word, explain it in the same sentence.
- Say what you are about to do in one line, do it, then say what changed and where to look.
- One question at a time, and only when you cannot decide yourself.
- When something fails, say what happened and what you will try next. Never paste a raw error and stop.

## What this is

```
Browser screen  ->  server on this computer  ->  data/crm.json
   (src/)              (server/)                  (the client list)
Claude  ->  mcp/server.ts  ->  the same data/crm.json
```

- `npm start` runs it at http://localhost:4747. It only answers to this computer.
- The owner's data is `data/crm.json`. Daily backups are in `data/backups/`.

## Use the CRM tools for data. Do not edit the data file by hand.

You have tools named `crm_today`, `crm_find_people`, `crm_get_person`, `crm_add_person`, `crm_update_person` and `crm_log`. They check every change before saving. Use them for anything about people, notes and follow-ups. Run `crm_find_people` before adding someone so you do not create a double.

If the tools are missing, the owner opened Claude in the wrong folder. Ask them to open the folder that contains this file.

## Where things live

| To change | Edit |
|---|---|
| Stages, extra boxes on a person, ready-made messages, the word for "clients" | `crm.config.ts` (and `presets/`) |
| What gets saved about a person | `shared/types.ts`, then the checks in `server/store.ts` |
| Rules: who is quiet, what is due, birthdays, streaks, referrals, import | `shared/logic.ts` with tests in `shared/logic.test.ts` |
| Colors and themes | `src/styles.css`, theme list in `src/screens/SettingsPage.tsx` |
| A screen | `src/screens/` |
| Menu items | `DESTS` in `src/App.tsx` |
| Buttons, boxes, pop-ups | `src/ui.tsx` |
| The "Add features" cards | `src/recipes.ts`, steps in `recipes/` |
| Tools you can use | `mcp/server.ts` |

## How to add a feature

1. If there is a matching file in `recipes/`, read it first and follow it.
2. Put any new rule in `shared/logic.ts` as a small function and add a test for it.
3. New thing to save? Add it to `shared/types.ts`, give it a default in `emptyPerson()` or `defaultSettings()`, and add its check in `server/store.ts`. Old data must keep loading.
4. Build the screen from the pieces in `src/ui.tsx` so it matches the rest.
5. Run `npm run check`. All three parts must pass before you say it is done.
6. If you changed anything in `server/`, `shared/`, `presets/`, `mcp/` or `crm.config.ts`, restart the CRM: stop the running `npm start` and start it again. Screen files in `src/` update on their own. A stale server refuses new fields with confusing errors.
7. Tell the owner to refresh the page, and tell them exactly where the new thing is.
8. Add one line to `CHANGELOG.md`.

## Rules that are never broken

- Never delete or overwrite `data/`. Before any change to how data is stored, copy `data/crm.json` to `data/backups/` first and say so.
- Never commit `data/` or any `.env` file. The client list does not go to GitHub.
- Never send an email or a text, or spend money, without the owner saying yes to that exact message and that exact list of people.
- Never put passwords or keys in code. They go in `.env.local`, which stays on this computer.
- Keep the server on `127.0.0.1` unless the owner asks to put the CRM online. If they do, follow `recipes/put-it-online.md`, which adds a login first.
- Check every input on the server. Never trust what the browser sends.
- Ask before installing any new package. Prefer what is already installed.
- Keep "Built by Drey Thomas" in the footer and the LICENSE file. That is the one condition of the license.

## Design rules for new screens

- Sizes: text 16, 20, 24, 32. Small labels 14. Spacing 4, 8, 12, 16, 24, 32, 48.
- One filled main button per screen. Everything else is a plain button or a link.
- Every list needs an empty state that says what to do next.
- Every button and box at least 48 pixels tall, with a visible label.
- Works on a phone-width window. No sideways scrolling except the Pipeline.
- Words the owner uses: clients, reach out, follow up, haven't talked in a while. Not: leads pipeline velocity, touchpoints cadence.

## Filing conversations from connections

The Connections screen (`src/screens/Connections.tsx`) sends owners to you with a message per source. When you save a conversation that came from the owner's calendar, call recorder, texts or email:

- Use `crm_log` with `source` set to `calendar`, `recorder`, `texts` or `email`, and `ref` set to the outside id (event id, recording id, thread id).
- The same `ref` for the same person is saved once, so it is safe to run a sync again.
- Save a short summary, not a full transcript. The limit is 60,000 characters.
- Match people by email or phone first, then by full name. Ask before adding anyone new.
- To add a new kind of source, add it to `SOURCES` in `shared/types.ts` and add a card in `src/recipes.ts`.
