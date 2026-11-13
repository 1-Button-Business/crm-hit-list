# Send real texts from the CRM

**What the owner gets:** A Send button that really sends a text from a business number through Twilio, to one person or a list, and logs each one on the person's page.

**Needs:** A Twilio account, a phone number from Twilio, and carrier approval for that number. Approval takes days, sometimes longer, and has fees. Each text costs money. Check Twilio's current prices on its site. Allow an hour to build, then the wait for approval.

**Status:** A written plan. Not pre-built. Build it fresh in this copy and test it with the owner.

## Before you start

- If this folder is a git repo, save a checkpoint: `git add -A && git commit -m "Checkpoint before texting"`. The `.gitignore` keeps `data/` and `.env` files out. Confirm `.env*` is still listed in `.gitignore`.
- If `data/crm.json` exists, copy it to `data/backups/before-send-texts-YYYY-MM-DD.json` (use today's date). Tell the owner you did.
- Tell the owner the free path first. The "Text" button in the Reach out box already opens their own phone's or computer's texting app with the message filled in. It costs nothing, needs no approval, comes from the number clients already know, and replies land on their phone. For one-to-one texting, recommend they keep using it. This recipe is for owners who need a separate business number or list texting.
- Read the current official Twilio docs first: sending an SMS, A2P 10DLC registration, toll-free verification, opt-out (STOP) handling, and error codes. Do not write the API call from memory.

## Steps

1. Be honest about the wait. In the US, texting people from an app with a normal local number needs A2P 10DLC registration: the business is registered, then its texting use is registered and reviewed. A toll-free number has its own verification. Both take days and have fees, and unregistered texts get blocked. Tell the owner this before they pay for anything. Outside the US the rules differ. Read the docs for their country.
2. Account. Stop and ask the owner to create the Twilio account themselves and add their own payment method. You wait. Never type card details or passwords for them.
3. Number and registration. Walk the owner through the current Twilio screens for buying a number and submitting the registration. The answers on those forms must be true: real business name, real website, and how people agreed to get texts. You can draft wording. The owner submits.
4. Keys. The owner must not paste secrets into the chat. Create `.env.local` in the project root with empty lines for the account id, the secret, and the sending number or messaging service. Use the names the current Twilio docs recommend. If Twilio offers a limited key instead of the main account secret, use that. The owner types the values into the file.
5. Load the file on the server only. In `package.json`, change the `start` script to `node --env-file-if-exists=.env.local server/main.ts` (skip if `recipes/send-email.md` already did). Nothing under `src/` and no `VITE_` name may hold these values.
6. Add what gets saved. In `shared/types.ts` add `textDailyCap: number` to `Settings`. Give it a default in `defaultSettings()` and a check in `settingsInput` in `server/store.ts`. Start low, for example 30. Add a `Setting` row on `src/screens/SettingsPage.tsx`.
7. Consent. Texting needs the person's permission first. Use two tags: `text-ok` for people who agreed, and `no-text` for people who said stop. A list send goes only to people tagged `text-ok`. Do not bulk-tag everyone. Ask the owner who agreed and how.
8. Build the sender in a new file `server/texts.ts`:
   - A zod schema `textInput`: `personIds` (1 to 100 ids), `body` (1 to 600 characters), `isList` (boolean), `.strict()`.
   - `previewText(store, input)` returns each person's name, phone number and exact message after `fillTemplate`, plus who is skipped and why: no phone, tagged `no-text`, not tagged `text-ok` on a list send, or over the daily cap. Also return how many message parts the text will use, since long texts are billed as more than one.
   - `sendText(store, input)` re-runs the checks on the server and sends one message per person with the built-in `fetch`, following the current docs. Ask before installing any package.
   - Take only person ids from the browser. Look up the phone number in the store. Put it in the format the docs require (with country code). If a number cannot be formatted with confidence, skip it and say so.
   - After Twilio accepts a message, log it with `store.addTouch({ personId, kind: "text", body })`.
   - If Twilio says the person has opted out, add the `no-text` tag with `store.updatePerson` and report it. Read the docs for the exact error to look for.
   - Do not retry failed sends by yourself. Report sent and failed.
9. STOP. Read the Twilio docs on how STOP, START and HELP replies are handled for the owner's number type. On a list send, the first text to a person ends with "Reply STOP to opt out." When the owner hears "stop" any other way, add `no-text` with `crm_update_person`.
10. Replies. This CRM runs on the owner's computer only, so Twilio cannot reach it to deliver replies. Tell the owner plainly: replies go to the Twilio number, not to the CRM. Offer two choices: set up forwarding of incoming texts in Twilio (read the docs for the current way), or do `recipes/put-it-online.md` first and add a reply inbox after. If replies are not built, change the card in `src/recipes.ts` so it no longer says "with replies logged".
11. Routes. In `server/api.ts`, add `POST text-preview`, `POST text` and `GET text-status` (returns only `{ ready: true or false }`) to the `switch` in `handleApi`. Add matching `Actions` in `src/api.ts`.
12. Screens. In `ReachOutDialog` in `src/dialogs.tsx`, add a plain "Send from business number" button, shown only when texting is ready and the person has a phone. It opens a confirm `Dialog` that shows the from number, the to number and the full message, with "Send" and "Cancel". Keep the existing "Text" button first. For lists, read `src/screens/People.tsx`, then add "Text these people" with a confirm screen that shows the count, every name and number, who is skipped and why, the exact message, and the rough cost. The button says "Send to 12 people".
13. Hours. Refuse list sends late at night or early in the morning in the owner's local time. Ask the owner for their window and default to 9am to 8pm.
14. Tests. Add `server/texts.test.ts` with a fake in place of the network call: consent tags are enforced, the cap blocks, `no-text` is skipped, bad phone numbers are skipped, an opt-out error adds the tag. Tests never send real texts.
15. First real text goes to the owner's own phone. Then one real person they pick. Run `npm run check`. Add one line to `CHANGELOG.md`.

## Ask the owner

1. "Do you need a separate business number, or is the free Text button that uses your own phone enough?"
2. "Who has agreed to get texts from you, and how did they agree?"
3. "What is the most texts you want this to send in one day? I will start at 30."

## Done when

- [ ] The number's registration is approved, and you have seen that in Twilio with the owner.
- [ ] A test text reached the owner's own phone from the business number.
- [ ] Every send shows the exact message and the exact list first, and nothing sends without pressing Send.
- [ ] Consent tags, `no-text` and the daily cap are enforced on the server, with tests.
- [ ] Each sent text shows as a Text entry on the person's page.
- [ ] The secrets are only in `.env.local`, and `npm run check` passes.

## Do not

- Never send without the owner saying yes to that exact message and that exact list. A yes for one send is not a yes for the next.
- Never text anyone who has not agreed, anyone tagged `no-text`, or a bought list.
- Never spend the owner's money without telling them the cost first.
- Never put secrets in code, the browser, the chat, git or a log. Never commit `.env.local` or `data/`.
- Do not promise a date for approval. You do not control it.
- Texting laws are strict and fines are real. Tell the owner this is not legal advice.
