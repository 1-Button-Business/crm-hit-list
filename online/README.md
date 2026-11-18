# Your CRM online

This folder puts your CRM on your own web address, like `https://crm.yourbusiness.com`. Only you can sign in.

It is the same site 1BB runs at crm.1buttonbusiness.com, set up for one owner. Your list lives in your own Convex database, not with 1BB.

**To set it up, open Claude in your CRM folder and say: "Put my CRM online."** Claude follows `recipes/put-it-online.md` step by step.

## How it fits together

```
Your phone or computer
   -> Cloudflare (your web address, serves the screens)
   -> Convex (your database and your login)
Claude -> your-site/mcp/<private key> -> Convex   (only if you turn on "Connect Claude")
```

## Everyday jobs

```bash
npm run check                                                                         # types, rule tests, build
npx convex deploy --yes --cmd 'npm run build' --cmd-url-env-var-name VITE_CONVEX_URL  # database + screens
npx wrangler deploy                                                                   # put the screens online
npx convex run --prod owner:resetLogin                                                # forgot the password
node setup.mjs you@yourbusiness.com --new-code                                        # then a fresh setup code
```

## Settings the database needs (set by `node setup.mjs`)

| Name | What it is |
|---|---|
| `OWNER_EMAIL` | The one email that can sign in |
| `OWNER_SETUP_CODE` | Needed once, to make the login. Stops anyone else claiming the site first |
| `SITE_URL` | Your site's address |
| `JWT_PRIVATE_KEY`, `JWKS` | Keys that sign each sign-in |

Never set `TEST_LOGIN` on the live database. It opens a test door with no password.
