# Changelog

## [2026-11-13]

### Changed
- The four Connections messages were rewritten after a test on a real calendar, recorder and inbox: they now work person by person, skip team and personal items, and show a list before saving.

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
