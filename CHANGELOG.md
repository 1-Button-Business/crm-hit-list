# Changelog

## [2026-11-18]

### Added
- `online/`: put your CRM on your own web address, with a login only you have. Claude follows `recipes/put-it-online.md` (rewritten and tested end to end).

## [2026-11-17]

### Changed
- The online demo opens in the 1BB theme. Your own copy still starts on "Match my device".
- Demo visitors from before start fresh so they see the new theme. The tour's Next button is no longer gold, so each screen keeps one gold button.

## [2026-11-16]

### Added
- A "1BB" theme in Settings: near-black with one gold accent, to match 1 Button Business.

## [2026-11-13]

### Changed
- The rulebook for what may be saved moved to `shared/schemas.ts`, and the app can now run on a hosted backend, so the members-only site shows the exact same screens. Your own copy works the same as before.
- The four Connections messages were rewritten after a test on a real calendar, recorder and inbox: they now work person by person, skip team and personal items, and show a list before saving.

### Fixed
- Connections screen after a look and feel inspection: one main button, one tag per row, repeated rows fold into one, names are easier to tap, the search says how many matched, and focus stays in the paste box after a save.
- The hidden tour no longer floats a button over forms. It comes back from the demo strip. Keyboard focus no longer lands under the phone tab bar.

### Added
- Connections screen: calendar meetings, call recorder notes, text threads and emails are saved under the right person, because members asked for one place that holds every conversation. Claude does the connecting; a calendar file and a paste box work with no Claude at all.
- Conversations remember where they came from and their outside id, so running a sync twice never saves doubles.
- 90-second narrated tour video, linked from the demo and the README, so owners see the daily habit and how to customize before they install.
- Online demo with a guided tour, so members can try it before installing anything.
- First version, built by Drey Thomas ahead of the CRM build session.
- Today screen with a daily reach-out goal and streak, because members asked for a simple daily list.
- "Haven't talked in a while", follow-up dates and birthdays, so nobody goes quiet by accident.
- Referral tracking with thank-you reminders, since referrals drive most members' business.
- Gift ideas, mailing address, gift log and an Amazon shopping link.
- Text, email and call buttons that open the owner's own apps, so no accounts are needed on day one.
- List import from a spreadsheet export, since several members have lists sitting unused.
- Six color themes.
- Claude plug-in (`mcp/server.ts`) so Claude can read and update the CRM.
- "Add features" screen and recipes so owners grow the CRM by asking.
