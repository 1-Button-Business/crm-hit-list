# Send real emails from the CRM

**What the owner gets:** A Send button that really sends the email through Resend, to one person or a list, and logs each one on the person's page.

**Needs:** A Resend account and a domain the owner controls (for example their website's domain) so mail comes from their own address. Resend has a free plan to start. Check its current limits and prices on its site. About 30 to 60 minutes, mostly waiting for the domain to verify.

**Status:** A written plan. Not pre-built. Build it fresh in this copy and test it with the owner.

## Before you start

- If this folder is a git repo, save a checkpoint: `git add -A && git commit -m "Checkpoint before email sending"`. The `.gitignore` keeps `data/` and `.env` files out. Confirm `.env*` is still listed in `.gitignore`.
- If `data/crm.json` exists, copy it to `data/backups/before-send-email-YYYY-MM-DD.json` (use today's date). Tell the owner you did.
- Read the current official Resend docs first: how to send, how keys and domains work, and the rate limits. Do not write the API call from memory. APIs change.

## Steps

1. Account. Stop and ask the owner to create a Resend account themselves. They type their own email and password. You wait.
2. Domain. Follow the current Resend docs to add the owner's sending domain. Resend gives DNS records. The owner adds them where their domain is managed. Explain DNS in one line: "the settings page for your domain name." Wait until Resend shows the domain as verified. Do not send from an unverified domain or a free mailbox address.
3. Key. Ask the owner to create an API key in Resend with send-only access if that option exists. They must not paste it in the chat. Create `.env.local` in the project root with empty lines and have the owner type the values into the file:
   - `RESEND_API_KEY=`
   - `EMAIL_FROM=` (for example `Dana <dana@theirdomain.com>`)
4. Load the file on the server only. In `package.json`, change the `start` script to `node --env-file-if-exists=.env.local server/main.ts`. Do not add these values to `vite.config.ts`, to anything under `src/`, or to any name that starts with `VITE_`. The browser must never see the key.
5. Add what gets saved. In `shared/types.ts` add to `Settings`: `emailDailyCap: number` and `mailingAddress: string`. Give both a default in `defaultSettings()` and a check in `settingsInput` in `server/store.ts`. Start the cap low, for example 50. Add `Setting` rows on `src/screens/SettingsPage.tsx`.
6. Build the sender in a new file `server/email.ts`:
   - A zod schema `emailInput`: `personIds` (array of ids, at least 1, at most 200), `subject` (1 to 200 characters), `body` (1 to 10,000 characters), `isList` (boolean). Use `.strict()` like the schemas in `server/store.ts`.
   - `previewEmail(store, input)` returns, for each id: name, email address, and the exact subject and body after `fillTemplate` from `shared/logic.ts`. It also returns who is skipped and why: no email, tagged `no-email`, would pass the daily cap.
   - `sendEmail(store, input)` re-runs the same checks on the server, then sends one email per person. Never send one email with everyone in the "to" line.
   - Take only person ids from the browser. Look up the email address in the store. Never accept an address typed into the request.
   - Make the request with the built-in `fetch`, following the current Resend docs. Ask the owner before installing any package.
   - After Resend accepts a message, log it with `store.addTouch({ personId, kind: "email", body })` where the body holds the subject and the text.
   - If one send fails, keep going, and report sent and failed separately. Do not retry by yourself. A retry can double-send.
   - Never put the key in an error message, a log line or a response.
7. Daily cap. Before sending, count today's `email` touches with `dayOf` from `shared/logic.ts`. If this send would pass `settings.emailDailyCap`, refuse the whole send with a plain message. Hand-logged emails count too, which errs on the safe side.
8. Opt-outs. A person tagged `no-email` is never sent to. For a list send, the server adds a footer to every message: one line saying how to stop getting these emails (reply "unsubscribe"), and the owner's mailing address from Settings. If `mailingAddress` is empty, refuse list sends and say why. When someone replies asking to stop, the owner or Claude adds the `no-email` tag with `crm_update_person`.
9. Routes. In `server/api.ts`, add two cases to the `switch` in `handleApi`: `POST email-preview` and `POST email`. Both read the body with `readJson` and go through `emailInput`. The local-only check and the JSON check at the top of `handleApi` already cover them. Add `GET email-status` that returns only `{ ready: true or false }` so the screen can hide Send when no key is set.
10. Client. In `src/api.ts`, add `previewEmail` and `sendEmail` to `Actions`.
11. One person. In `ReachOutDialog` in `src/dialogs.tsx`, add a plain "Send email now" button next to the existing Email button, shown only when the person has an email and email is ready. It opens a confirm pop-up (use `Dialog` from `src/ui.tsx`) that shows the from address, the to address, the subject and the full body, with "Send" and "Cancel". Only "Send" calls the server. Keep the existing Email button. It opens the owner's own mail app and stays the free path.
12. A list. Read `src/screens/People.tsx` first. Add "Email these people" for the current filtered list. The confirm screen shows the count, every name and address, who is skipped and why, and the exact message for the first person including the footer. The Send button text says the number: "Send to 23 people".
13. Tests. Add `server/email.test.ts`: input checks reject bad shapes, `no-email` people are skipped, the cap blocks, the footer is added on list sends, and a person with no email is skipped. Replace the network call with a fake in tests. Tests must never send real mail.
14. First real send goes to the owner's own address only. Then one real person the owner picks. Then lists.
15. Run `npm run check`. Add one line to `CHANGELOG.md` and a short "Email" note in `README.md` or `CLAUDE.md` naming the two values in `.env.local`.

## Ask the owner

1. "Which email address should these come from? It has to be on a domain you own."
2. "What is the most emails you want this to send in one day? I will start at 50."
3. "What mailing address should go at the bottom of list emails? The law asks for one."

## Done when

- [ ] A test email reached the owner's own inbox, not the spam folder, from their own address.
- [ ] Every send shows the exact message and the exact list first, and nothing sends without pressing Send.
- [ ] Each sent email shows as an Email entry on the person's page.
- [ ] `no-email` people and the daily cap are enforced on the server, with tests.
- [ ] The API key lives only in `.env.local`. Search the code and the built files in `dist/` for it and find nothing.
- [ ] `npm run check` passes and the owner has sent one real email and seen it logged.

## Do not

- Never send without the owner saying yes to that exact message and that exact list. A yes for one send is not a yes for the next.
- Never put the key in code, in the browser, in the chat, in git or in a log.
- Never send to people who did not ask to hear from the owner, or to a bought list.
- Never commit `.env.local` or `data/`.
- Do not send as Claude through the CRM tools. Sending stays behind the confirm screen.
- In the US, the CAN-SPAM rules ask for an honest "from" and subject, a real mailing address, and a way to opt out that is honored quickly. Tell the owner this is not legal advice and other countries have their own rules.
