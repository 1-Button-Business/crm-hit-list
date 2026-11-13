// The guided walk-through shown on the online demo only.
import { useEffect, useState } from "react";
import { config } from "../crm.config.ts";
import { resetDemo } from "./demoStore.ts";
import { Button, go } from "./ui.tsx";

const REPO = `https://github.com/1-Button-Business/${{ "Client Roster": "crm-client-roster", "Hit List": "crm-hit-list", "Gift Book": "crm-gift-book" }[config.title] ?? "crm-client-roster"}`;
const who = config.personWord;

const STEPS: { path: string; title: string; text: string }[] = [
  { path: "/today", title: "This is your morning screen", text: `It answers one question: who should I talk to today? The ring counts your reach-outs against your daily goal. Below it are follow-ups that are due, birthdays this week, and every ${who} you have not talked to in a while.` },
  { path: "/today", title: "Try it: press any Reach out button", text: "Pick a ready-made message or write your own. Text, Email and Call open your own apps. Then press \"I reached out, log it\" and watch the ring fill up." },
  { path: "/people", title: `Everyone in one list`, text: "Search by name, phone or anything in your notes. Filter by stage or tag. Tick the box to see only the people who have gone quiet." },
  { path: "/people", title: `Open a ${who}`, text: "Tap any name. You get their next follow-up, a pinned note for the things you want to keep in mind, plus a full history of calls, texts, gifts and notes. Set a follow-up 3 months out. They show up on Today when that day comes." },
  { path: "/pipeline", title: "Your pipeline", text: "Everyone lined up by stage. One button moves a person to the next stage. The stages are yours to rename." },
  { path: "/dates", title: "Birthdays, dates and gifts", text: "Birthdays and anniversaries show up before the day arrives. Each person holds gift ideas and a mailing address, and a button opens Amazon with their gift idea already searched." },
  { path: "/referrals", title: "Who sends you business", text: "Mark who sent each person to you. This screen counts referrals and reminds you of every thank-you you still owe." },
  { path: "/import", title: "Bring your list with you", text: "Export a spreadsheet from ManyChat, a Google Form or your old CRM and drop it here. It works out the columns for you." },
  { path: "/grow", title: "Add anything by asking", text: "You never wait on a software company again. Want a new screen, a new stage, your brand colors? Copy a message, paste it into Claude, and Claude builds it into your CRM in minutes." },
  { path: "/settings", title: "Make it look like yours", text: "Pick a color theme, set your daily goal and decide how many days counts as quiet. Try a theme now." },
  { path: "/today", title: "Ready for your own?", text: "Your copy runs on your computer with your real people. Nobody else can see it, and there is no monthly fee. It takes about 5 minutes to set up with Claude." },
];

export function Tour() {
  const [step, setStep] = useState(() => Number(sessionStorage.getItem("tour-step") ?? 0));
  const [open, setOpen] = useState(() => sessionStorage.getItem("tour-open") !== "no");
  useEffect(() => { sessionStorage.setItem("tour-step", String(step)); sessionStorage.setItem("tour-open", open ? "yes" : "no"); }, [step, open]);
  const s = STEPS[step] ?? STEPS[0]!;
  const last = step === STEPS.length - 1;
  const move = (n: number) => { const next = Math.min(Math.max(n, 0), STEPS.length - 1); setStep(next); go(STEPS[next]!.path); };

  if (!open) {
    return <Button kind="primary" onClick={() => setOpen(true)} className="fixed right-4 bottom-24 z-30 shadow-lg lg:bottom-4">Show the tour</Button>;
  }
  return (
    <aside aria-label="Guided tour" className="goal-card fixed inset-x-3 bottom-24 z-30 grid gap-2 rounded-2xl border bg-surface p-3 shadow-lg sm:left-auto sm:w-96 sm:gap-3 sm:p-4 lg:right-4 lg:bottom-4">
      <p className="flex items-center justify-between gap-2 text-sm font-semibold text-accent">
        <span aria-live="polite">Tour: step {step + 1} of {STEPS.length}</span>
        <button className="-my-2 min-h-12 rounded-xl px-3 text-soft hover:text-ink" onClick={() => setOpen(false)}>Hide</button>
      </p>
      <h2 className="text-base sm:text-xl">{s.title}</h2>
      <p className="text-soft">{s.text}</p>
      <div className="flex flex-wrap gap-2">
        {step > 0 && <Button onClick={() => move(step - 1)}>Back</Button>}
        {last
          ? <a className="inline-flex min-h-12 items-center rounded-xl bg-accent px-4 font-semibold text-on-accent" href={REPO} target="_blank" rel="noreferrer">Get your own copy</a>
          : <Button kind="primary" onClick={() => move(step + 1)}>Next</Button>}
        {last && <Button onClick={() => { resetDemo(); sessionStorage.clear(); location.hash = "/today"; location.reload(); }}>Start over</Button>}
      </div>
    </aside>
  );
}

/** The strip across the top of the demo. */
export function DemoBanner() {
  return (
    <p className="max-w-none rounded-2xl border border-line bg-raised px-4 py-3 text-sm">
      <span className="font-semibold">You are looking at a demo.</span> The people are made up and anything you change stays in this browser.{" "}
      <a className="font-semibold underline" href="tour.mp4" target="_blank" rel="noreferrer">Watch the 90-second video</a>{" "}or{" "}
      <a className="font-semibold underline" href={REPO} target="_blank" rel="noreferrer">get your own copy</a>.
    </p>
  );
}
