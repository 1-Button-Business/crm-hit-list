# Use it on my phone (put the CRM online)

**What the owner gets:** Their CRM at a web address, behind a password only they have, so it works from their phone anywhere.

**Needs:** A Convex account (holds the data and the login) and a Cloudflare account (serves the screen). Both have free plans to start. Check current limits on their sites. Allow 2 to 3 hours with the owner present.

**Status:** A written plan. Not pre-built. Build it fresh in this copy and test it with the owner.

## Before you start

- Say this to the owner first: "Right now your client list can only be opened on this computer. After this, it can be reached from the internet, so the login comes first and I will test it before your real clients go in."
- If this folder is a git repo, commit and tag: `git add -A && git commit -m "Last local-only version" && git tag local-only`. If it is not a repo, run `git init` first. The `.gitignore` keeps `data/` and `.env` files out.
- Copy `data/crm.json` to `data/backups/before-going-online-YYYY-MM-DD.json` and ask the owner to also copy that file somewhere off this computer.
- Read the current official docs for Convex (schemas, functions, auth in functions, data import, HTTP actions, deploying, environment variables), Convex Auth (password sign-in, setup, how to limit who can sign up) and Cloudflare Pages (deploying a Vite site). Do not write this from memory. These APIs change.
- Ask before installing each package. Check that it is the official one and pin an exact version.

## Steps

### Phase 1. Accounts and project
1. Stop and ask the owner to create the Convex account themselves. Wait. Then create the Convex project by following the current docs. It adds a `convex/` folder. Commit that folder. Never commit deploy keys.
2. Explain the two copies Convex gives you in one line: a practice copy (dev) and the real one (production). Build and test on practice first.

### Phase 2. Login first, with no client data online yet
3. Add Convex Auth with password sign-in by following its current setup guide.
4. Lock sign-up after the first account. In the place the docs give for running code when an account is created, refuse if any user already exists. Also keep a single-owner check in every function (step 7), so even a stray account sees nothing.
5. Build the sign-in screen from `Field`, `Button` and `Card` in `src/ui.tsx`. In `src/App.tsx`, show nothing but sign-in until the user is signed in. Add "Sign out" to `src/screens/SettingsPage.tsx`.
6. The owner creates their own account and types their own password. You never see it. Then try to create a second account and confirm it is refused.

### Phase 3. Data shape and rules
7. Port `shared/types.ts` to `convex/schema.ts`: tables for people, touches and settings. Every row has an `ownerId`, with an index on it. In every query and mutation, the first lines get the signed-in user from the auth helper in the docs, stop if there is none, and read and write only rows where `ownerId` is that user. Never take an owner id from the browser.
8. Port each method of `Store` in `server/store.ts` to a Convex function: `addPerson`, `importPeople`, `updatePerson`, `removePerson`, `addTouch`, `removeTouch`, `updateSettings`, and one query that returns the same `Db` shape as `Store.read()`.
9. Keep every check from `personInput`, `touchInput` and `settingsInput`: the length limits, date formats, the stage fallback to `config.firstStage`, and the `referredById` cleanup. Convex validators check types. Check lengths and formats in the function body, or reuse the zod schemas if the docs say zod runs there.
10. `shared/logic.ts` stays as it is. It is pure and keeps running in the browser.
11. Write tests for the access rules using the test approach in the current Convex docs: signed-out calls fail, and user B cannot read or change user A's rows.

### Phase 4. Move the data
12. Write a one-time import script that reads `data/crm.json` and loads it for the owner's user id. Old ids will not match new ids, so keep a map from old person id to new id and use it for `referredById` and each touch's `personId`. Keep `createdAt` and each touch's `at`.
13. Run it on practice first. Compare counts of people and touches to the file. Spot-check five people with the owner. Then run it once on production. Never run it twice.

### Phase 5. Swap the screen over
14. Rewrite `useDb()` in `src/api.ts` on Convex hooks, and keep what it returns the same: `{ db, error, refresh, actions }` with the same `Actions`. Then the screens in `src/screens/` do not change. Wrap the app in the Convex and auth providers in `src/main.tsx`.
15. The spreadsheet download on `SettingsPage.tsx` points at `/api/export`, which will not exist online. Build the file in the browser with `peopleToCsv` from `shared/logic.ts`.
16. Daily backups in `data/backups/` stop once data lives in Convex. Add a "Download a full backup" button that saves the whole `Db` as a file, and tell the owner to press it weekly. Read the Convex docs on backups for what their plan includes.
17. Claude's tools in `mcp/server.ts` still read the local file. Decide with the owner: point them at Convex using a secret kept in `.env.local` and the method the docs give for trusted scripts, or leave them off. Do not leave them quietly reading old data. Update `CLAUDE.md` to match.

### Phase 6. Deploy
18. Deploy Convex to production by following the docs. Set its environment variables there, not in code.
19. Stop and ask the owner to create the Cloudflare account. Deploy the built site (`npm run build`, output folder `dist`) to Cloudflare Pages. The Convex web address is given to the build as a `VITE_` variable. That address is public by design. Nothing secret may use a `VITE_` name.
20. Add a `public/_headers` file with basic security headers (no framing, no content-type sniffing, HTTPS only), following the current Cloudflare Pages docs.

### Phase 7. Verify from a phone
21. On the owner's phone: open the address, sign in, add a test person, log a note, set a follow-up. See it appear on the computer. Sign out and confirm the list is gone.
22. Run the security checklist below. Do not call it done until every line passes.

### Phase 8. Keep the local copy
23. Leave `data/crm.json`, `data/backups/` and the `local-only` tag in place. Update `README.md`, `CLAUDE.md` and `CHANGELOG.md` to say where the data lives now, how to deploy, which environment variables exist, and that `data/crm.json` is now an old backup, not the live list.

## Security checklist

- [ ] Every Convex query, mutation and action checks the signed-in user before it does anything. Open each one and look.
- [ ] No function returns people or touches without an owner filter. There are no public list endpoints.
- [ ] Signed out, calling each function from a private browser window returns nothing or an error. You tried each one.
- [ ] A second account cannot be created. You tried.
- [ ] No secret is in the repo, in `src/`, in `dist/` or in a `VITE_` variable. You searched.
- [ ] The password is known only to the owner. Sign-in attempts are limited if the docs offer it.

## Ask the owner

1. "This puts your client list on the internet behind a password. Are you ready for me to start, and can you stay with me for the signups?"
2. "Pick a long password you do not use anywhere else. Type it yourself when the screen asks."
3. "Do you want me (Claude) to keep being able to read and update your CRM once it is online?"

## Done when

- [ ] The owner signed in on their phone and saw their real people, with counts that match the old file.
- [ ] Every line of the security checklist passes.
- [ ] `npm run check` passes, including the new access tests.
- [ ] The local backup and the `local-only` tag still exist, and the docs say how to deploy and restore.

## Do not

- Never put real client data online before the login works and the signed-out test passes.
- Never delete or change `data/crm.json` or `data/backups/`.
- Never type the owner's password, card or signup details for them, and never ask for them in chat.
- Never commit keys, `.env` files or `data/`.
- Never open `server/main.ts` to the network as a shortcut. It has no login.
- Do not skip a failing checklist line because "it is only one user".
