# A lead form for my website

**What the owner gets:** A form link for their bio or website. Anyone who fills it in lands in the CRM as a new person in the first stage, marked "Lead form".

**Needs:** The CRM online first. Do `recipes/put-it-online.md` before this one. No new accounts. No extra cost on the free plans, within their limits. About 45 minutes.

**Status:** A written plan. Not pre-built. Build it fresh in this copy and test it with the owner.

## Before you start

- Check the CRM is really online: there is a `convex/` folder, sign-in works, and the security checklist in `recipes/put-it-online.md` passed. If not, stop and tell the owner that recipe comes first. A form cannot reach a CRM that only runs on their computer.
- Save a checkpoint: `git add -A && git commit -m "Checkpoint before lead form"`. The `.gitignore` keeps `data/` and `.env` files out.
- Make a backup of the live data with the "Download a full backup" button, or the way the Convex docs give. If `data/crm.json` still exists locally, also copy it to `data/backups/before-lead-form-YYYY-MM-DD.json`.
- Read the current official Convex docs first: public functions or HTTP actions, internal functions, rate limiting, and environment variables. Do not write this from memory.
- Say this to the owner: "This is the one door into your CRM that strangers can use. It only lets them drop in a name and a message. It never shows them anything."

## Steps

1. The form key. Add `formKey: string` to the owner's settings. Generate it on the server with a real random source, at least 32 characters. Never use something guessable like the business name or a counter. Only the signed-in owner can create or replace it. Add a "Lead form" card on `src/screens/SettingsPage.tsx` with the link, a Copy button, "Turn off" (clears the key) and "Make a new link" (replaces it, which kills the old link).
2. The one public endpoint. Add a single function that anyone can call without signing in. Use the kind the current Convex docs recommend for public form posts. It takes: the form key, name, email, phone, message, and the honeypot field. It does exactly one thing: creates one person.
   - Look up which owner has that form key. If none, or the form is off, return the same plain success as always and save nothing.
   - The new person gets: `stage` set to `config.firstStage`, `source` set to `"Lead form"`, the message in `about`, `followUpOn` set to today, and `followUpNote` set to "New from your lead form". That puts them on the owner's Today screen under "Follow up today" with no new screen to build.
   - The caller cannot set stage, tags, source, owner, dates or any other field. Ignore or reject anything extra.
3. Check and limit every input on the server, with the same limits as `personInput` in `server/store.ts`: name 1 to 200 characters, email up to 320 and shaped like an email, phone up to 60, message up to 2,000. Trim everything. Require a name and at least one of email or phone. Store text as plain text. Reject a request body that is too large before reading it.
4. Honeypot. Add one extra field to the form that people cannot see and should not fill in, hidden from screen readers and from tab order, with a name that looks tempting to a bot (for example `website`). If it arrives filled in, return the normal success and save nothing.
5. Rate limit. Follow the current Convex docs for rate limiting. Set two limits: a small number of submissions per form key per minute, and a daily ceiling per form key. Over the limit, return a plain "Please try again later" and save nothing. Tell the owner the numbers you chose.
6. The endpoint never returns data. Success is always the same short message. It does not say whether that email is already in the CRM, how many people exist, or who the owner is. Errors for bad input say only what to fix in the form. No ids, no stack traces.
7. Doubles. Do not look up existing people in a way that changes the response. Always create a new person. The owner can merge later with the "Clean up my list" card.
8. Keep the rest locked. Open every other function in `convex/` again and confirm each still checks the signed-in user. This recipe adds one public door. It must not loosen any other.
9. The public page. Add a form page that loads without signing in and without loading any CRM data. In `src/App.tsx`, handle a route like `#/form/<key>` before the sign-in gate and before `useDb()` runs, or build it as its own small page. It shows:
   - The business name and a short line the owner writes.
   - Name, email, phone and "How can I help?" using `Field`, `Area` and `Button` from `src/ui.tsx`. Every box has a visible label and is at least 48 pixels tall.
   - One filled button: "Send".
   - A one-line note under the button on how the details will be used. Ask the owner for the wording.
   - After sending: a thank-you message the owner writes. On an error, the form keeps what the person typed. The button is off while sending, so a double tap does not send twice.
   - No CRM menu, no header button, no client data.
   - Keep "Built by Drey Thomas" in small text in the footer.
10. The public page needs the business name. Return it from a tiny public query keyed by the form key that gives back the business name and nothing else, or bake it into the page. Do not expose the settings table.
11. If the form will be embedded on another website, read the docs on allowed origins and allow only the owner's site. If it is only a link, skip this.
12. Tests. Using the test approach in the Convex docs, cover: a good submission creates one person in the first stage with source "Lead form", a wrong key saves nothing and returns the same success, a filled honeypot saves nothing, too-long input is rejected, extra fields are ignored, the rate limit blocks, and the response body never holds person data.
13. Try to break it by hand. From a private browser window, signed out: submit the form, then try calling the other functions and confirm you get nothing. Paste a very long message. Submit 20 times fast.
14. Deploy, following the steps written down in `recipes/put-it-online.md`. Submit one real test from the owner's phone. See the person on the Today screen. Then remove the test person with the owner's yes.
15. Run `npm run check`. Add one line to `CHANGELOG.md`, and add the form to `README.md` and `CLAUDE.md`: where the key lives and how to turn the form off.

## Ask the owner

1. "What should the form say at the top, and what should people see after they send it?"
2. "Do you want to ask for phone, email or both?"
3. "Will you share this as a link, or put it inside your website? If inside, what is the website address?"

## Done when

- [ ] A test submission from a phone showed up on Today as a new person in the first stage with source "Lead form".
- [ ] Signed out, nothing but the form works. No call returns any client data. You tried.
- [ ] Wrong key, filled honeypot and too-long input all save nothing.
- [ ] The rate limit blocked a fast burst.
- [ ] The owner can copy the link, turn the form off and make a new link from Settings.
- [ ] `npm run check` passes and the owner has seen their own test lead arrive.

## Do not

- Never build this on the local-only CRM, and never open `server/main.ts` to the network to make it work.
- Never let the public endpoint read, list, search, update or delete anything.
- Never return ids, counts, names or "already exists" from the public endpoint.
- Never use a short or guessable form key, and never put the owner's user id in the link.
- Do not auto-reply to people who fill in the form unless the owner has done `recipes/send-email.md` and said yes to that exact message.
- Never commit keys, `.env` files or `data/`.
