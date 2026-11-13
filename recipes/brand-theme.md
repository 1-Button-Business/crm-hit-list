# Make it match my brand

**What the owner gets:** A new theme in Settings that uses their own brand colors, with an optional logo in the header.

**Needs:** Their brand colors (hex codes) or a website link to read them from. No accounts. No cost. About 10 minutes.

**Status:** A written plan. Not pre-built. Build it fresh in this copy and test it with the owner.

## Before you start

- If this folder is a git repo, save a checkpoint: `git add -A && git commit -m "Checkpoint before brand theme"`. The `.gitignore` keeps `data/` and `.env` files out.
- If `data/crm.json` exists, copy it to `data/backups/before-brand-theme-YYYY-MM-DD.json` (use today's date). Tell the owner you did.
- Read `src/styles.css` and `src/screens/SettingsPage.tsx` so you copy the pattern that is already there.

## Steps

1. Get the colors. If the owner gave hex codes, use those. If they gave a website link, fetch the page and read its main background color, text color and button color. Say the colors back to the owner in plain words ("dark green buttons on an off-white page") before you build.
2. Pick a short theme id in lowercase with no spaces, for example `mybrand`. It must not match an id already in `THEMES` (`daylight`, `harbor`, `rose`, `midnight`, `forest`, `ember`).
3. In `src/styles.css`, add one new `[data-theme="mybrand"]` block next to the other themes. Copy the `harbor` block for a light brand or the `midnight` block for a dark brand, then change the values. Set all ten: `--bg`, `--surface`, `--raised`, `--line`, `--ink`, `--soft`, `--accent`, `--on-accent`, `--good`, `--warn`. Set `color-scheme` to `light` or `dark` to match.
4. Map the brand to the ten values like this:
   - `--accent` is the brand's main button color. `--on-accent` is the text that sits on that button.
   - `--bg` is the page behind the cards. `--surface` is the cards. `--raised` is a shade between them for hover and chips. `--line` is borders.
   - `--ink` is main text. `--soft` is quieter text and labels.
   - Keep `--good` green and `--warn` orange or amber. Do not swap them for brand colors. They carry meaning.
5. Check contrast with real math, not by eye. Write a short throwaway script (run it with `node`, do not add it to the project) that computes the WCAG contrast ratio for these pairs. Each must be 4.5 to 1 or higher:
   - `--ink` on `--surface`, `--ink` on `--bg`, `--ink` on `--raised`
   - `--soft` on `--surface`, `--soft` on `--bg`, `--soft` on `--raised`
   - `--on-accent` on `--accent`
   - `--accent` on `--surface` and on `--raised` (the active menu item is accent text on raised)
   - `--good` on `--surface`, `--warn` on `--surface`
   - `--line` against `--surface` should be at least 3 to 1 so boxes and buttons have a visible edge.
6. If a brand color fails, darken or lighten it in small steps until it passes. Tell the owner which color you changed and by how much. Do not ship a failing pair to stay "on brand".
7. In `src/screens/SettingsPage.tsx`, add one entry to the `THEMES` array: `{ id: "mybrand", label: "<Business name>", bg: "<the --surface value>", dot: "<the --accent value>" }`. The label is what the owner sees on the button.
8. Do not change `settingsInput` in `server/store.ts`. The `theme` setting already accepts any short text.
9. Turn the theme on for the owner with the Settings screen, or tell them to open Settings, then Look, and pick it.
10. Optional logo. Only if the owner wants it:
    - Ask them to drag the logo file into the chat or the folder. Save it in `public/` as `logo.svg` or `logo.png`. Keep it under about 200 KB.
    - In `src/App.tsx`, inside the `<header>`, add an `<img src="/logo.svg" alt="" className="h-8 w-auto" />` before the business name. Keep the header at its current height.
    - Check the logo on the new theme and on at least one dark theme. If it disappears on dark, tell the owner and offer to show it only on their brand theme.
11. Optional font. Only if the owner asks. The font is `--font-sans` in the `@theme` block. A web font needs a `<link>` in `index.html`. Keep one font family and body text at 16 pixels.
12. Look at every screen in the new theme: Today, the people list, one person's page, Pipeline, Dates, Settings, the Add pop-up and the Reach out pop-up. Check the focus ring (press Tab) is easy to see.
13. Run `npm run check`.
14. Add one line to `CHANGELOG.md`.

## Ask the owner

1. "What are your brand colors, or what is your website link so I can read them?"
2. "Do you want a light look or a dark look?" (Only ask if the brand could go either way.)
3. "Do you want your logo in the top bar? If yes, drag the file in."

## Done when

- [ ] The new theme shows on the Settings screen under Look and can be picked.
- [ ] Every contrast pair in step 5 passes 4.5 to 1, and you told the owner the numbers for the main ones.
- [ ] The six built-in themes and "Match my device" still work.
- [ ] `npm run check` passes.
- [ ] The owner has refreshed the page, picked the theme and said it looks right.

## Do not

- Do not edit or delete the built-in theme blocks.
- Do not use brand colors for `--good` or `--warn`.
- Do not ship text that fails 4.5 to 1 contrast.
- Do not remove "Built by Drey Thomas" from the footer.
- Do not install a package for this. It is CSS and one array entry.
- Do not commit `data/` or any `.env` file.
