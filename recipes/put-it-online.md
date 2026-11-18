# Put my CRM online (my own web address)

**What the owner gets:** Their CRM at their own web address, like `https://crm.theirbusiness.com`. Only they can sign in, from any phone or computer. Their list lives in their own database, not with 1BB.

**How:** The `online/` folder in this repo is the same site 1BB runs at crm.1buttonbusiness.com, set up for one owner. Nothing needs to be built. You set it up, test it, and move their list in.

**Needs:** A Convex account (holds the data and the login) and a Cloudflare account (serves the screens). Both have free plans to start. Check current limits on their sites. A domain they own, if they want their own address. Allow about 45 minutes with the owner present.

## Before you start

- Say this to the owner first: "Right now your client list can only be opened on this computer. After this, it can be reached from the internet behind a login only you have. I will test the login before any of your real clients go in."
- Commit and tag the local version: `git add -A && git commit -m "Last local-only version" && git tag local-only`. Run `git init` first if this is not a repo. The `.gitignore` keeps `data/` and `.env` files out.
- Copy `data/crm.json` to `data/backups/before-going-online-YYYY-MM-DD.json` and ask the owner to also keep a copy off this computer.

## Steps

### 1. Accounts (the owner does these)
1. Stop and ask the owner to make a Convex account at convex.dev and a Cloudflare account at cloudflare.com. Wait for both. Never type their signup details.
2. Run `npm ci` in the repo root first (the online site reuses the CRM's shared rules from there), then `cd online && npm ci`. Then `npx convex login` and `npx wrangler login`. The owner approves each in their browser.

### 2. The database and the login (no client data yet)
3. `cd online && npx convex deploy --yes --cmd 'npm run build' --cmd-url-env-var-name VITE_CONVEX_URL`. The first run asks to create a project: call it `my-crm`. It prints the Convex address. Write down the `.convex.site` version of it.
4. Put that `.convex.site` address in `online/wrangler.jsonc` under `vars.CONVEX_SITE`. Rename `"name"` if the owner wants.
5. `npx wrangler deploy`. It prints the site address, ending in `.workers.dev`. If they want their own domain, do step 6 first and use that address here instead.
6. Optional, their own domain: the domain must be added to their Cloudflare account (Cloudflare walks them through changing the nameservers where they bought it; this can take a few hours). Then add to `wrangler.jsonc`: `"routes": [{ "pattern": "crm.theirbusiness.com", "custom_domain": true }]` and run `npx wrangler deploy` again. Cloudflare makes the address and its HTTPS certificate on its own.
7. `node setup.mjs owner@theirbusiness.com https://their-site-address`. Use the exact address from step 5 or 6, no slash at the end. It sets the sign-in keys and prints a setup code. Only that email can ever sign in.
8. The owner opens the address, presses "First time here? Make your login", and types their email, a new password and the setup code. You never see the password.

### 3. Prove the lock works (before any real data)
Run every check below. Do not move data until all pass.
- Signed out: in a private window, the site shows only the sign-in box.
- Signed out, the database refuses: `curl -s -X POST https://<deployment>.convex.cloud/api/query -H 'content-type: application/json' -d '{"path":"crm:db","args":{},"format":"json"}'` answers `"status":"error"` with "Sign in first."
- Second account refused: on the sign-in screen, try "Make your login" with a different email and any code. It says the CRM belongs to someone else.
- Wrong setup code refused: try "Make your login" with the owner's email and a wrong code. Refused.
- Wrong password refused: try signing in with the owner's email and a wrong password. Refused.
- `npm run check` passes in `online/` (includes the one-owner rule tests in `convex/owner.test.ts`).

### 4. Move the list
9. Signed in on the new site, the owner picks their CRM type, then goes to People and uses the import box with `data/crm.json`'s people exported as a spreadsheet (Settings, "Download my people as a spreadsheet" on the local copy). Conversations come over the same way from the import screen.
10. Compare counts with the local copy. Spot-check five people with the owner.

### 5. Claude, optional
11. Ask: "Do you want me to keep being able to read and update your CRM once it is online?" If yes: Settings, "Connect Claude", make a key, and paste the private link into Claude as a connector. The link goes through their own site. If no, skip it. Never leave the local `mcp/` tools pointing at the old file without telling them.

### 6. Finish
12. Update this repo's `README.md`, `CLAUDE.md` and `CHANGELOG.md`: where the data lives now, how to deploy (`online/README.md`), and that `data/crm.json` is now an old backup, not the live list.
13. Tell the owner: Settings, "Download my people as a spreadsheet" is their backup. Do it now and then.

## Tested

Run end to end on 2026-11-18 on a throwaway Convex project and a `workers.dev` address, with a fake owner and one fake person:
- Site and sign-in screen load; security headers present; a bad Claude link gets 401.
- Signed out: reading the list, adding a person and the admin list are all refused.
- A second email cannot make a login or sign in. No setup code or a wrong one is refused. A second login for the owner is refused. A wrong password is refused.
- The owner makes a login with the code, signs in, adds a person and reads it back.
- `owner:resetLogin` plus `--new-code`, then a new login, finds the same list.
- Found and fixed: the root folder needs `npm ci` too (step 2).
- Custom domain, tested 2026-11-18 from a fresh clone of the public template: step 6 on a subdomain of a domain already on the Cloudflare account went live with HTTPS in under a minute. Every lock check passed on that address, and the Claude link worked through it (a changed key was refused). A brand-new domain also has to finish its nameserver change first, which can take hours.

## Forgot the password

```bash
cd online
npx convex run --prod owner:resetLogin                      # removes the password, signs out every device, keeps the list
node setup.mjs owner@theirbusiness.com --new-code          # fresh setup code
```
Then they make a new login on the site with the new code. Same list.

## Security checklist

- [ ] Every database call checks the signed-in user is the owner (`member()` in `convex/crm.ts`; `OWNER_EMAIL` replaces the member list). `npm run check` proves it.
- [ ] Signed out, the database refuses (step 3 curl).
- [ ] A second email cannot sign in or make a login. You tried.
- [ ] A login cannot be made without the setup code. You tried.
- [ ] `TEST_LOGIN` is not set on the live database: `npx convex env list --prod`.
- [ ] No secret is in the repo, `dist/` or a `VITE_` variable. The setup code and keys live only in Convex settings.
- [ ] The site sends security headers (`online/public/_headers`): `curl -sI https://their-site | grep -i x-frame`.

## Do not

- Never put real client data online before every line of step 3 passes.
- Never delete or change `data/crm.json` or `data/backups/`.
- Never type the owner's password or signup details, and never ask for them in chat. The setup code is fine to show: it only works once with their email, and only to make the first login.
- Never commit keys or `.env` files.
- Never open `server/main.ts` to the network as a shortcut. It has no login.
