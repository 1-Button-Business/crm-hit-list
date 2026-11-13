import { useState } from "react";
import type { ReactNode } from "react";
import { useCrm } from "../crm.ts";
import { accounts, askNow, builds } from "../recipes.ts";
import type { Recipe } from "../recipes.ts";
import { Button, Card } from "../ui.tsx";

export function RecipeCard({ r, featured, chip }: { r: Recipe; featured?: boolean; chip?: ReactNode }) {
  const { say } = useCrm();
  const [open, setOpen] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(r.prompt); say("Copied. Now paste it into Claude."); }
    catch { setOpen(true); say("Could not copy. The message is open below. Select it and copy it by hand.", "warn"); }
  }
  return (
    <li className={`grid content-start gap-3 rounded-xl p-4 ${featured ? "goal-card border md:col-span-2" : "bg-raised"}`}>
      {featured && <p className="text-sm font-semibold text-accent">Start here</p>}
      <h3 className="flex flex-wrap items-center gap-2 text-xl">{r.title}{chip}</h3>
      <p className="text-soft">{r.get}</p>
      <p className="text-sm text-soft"><span className="font-semibold text-ink">You need:</span> {r.needs}</p>
      <details className="text-sm" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
        <summary className="min-h-12 content-center font-semibold underline">See the message</summary>
        <p className="max-w-none rounded-xl border border-line bg-surface p-3 whitespace-pre-wrap">{r.prompt}</p>
      </details>
      <Button onClick={copy} className="justify-self-start" aria-label={`Copy message for Claude: ${r.title}`}>Copy message for Claude</Button>
    </li>
  );
}

const Group = ({ title, intro, items, className, feature }: { title: string; intro: string; items: Recipe[]; className?: string; feature?: boolean }) => (
  <Card title={title} className={className}>
    <p className="mb-4 text-soft">{intro}</p>
    <ul className="grid gap-4 md:grid-cols-2">{items.map((r, i) => <RecipeCard key={r.title} r={r} featured={feature && i === 0} />)}</ul>
  </Card>
);

export function Grow() {
  return (
    <>
      <Card title="Your CRM grows by asking" className="rise">
        <ol className="grid list-decimal gap-2 pl-6 text-soft">
          <li>Open Claude and choose the folder this CRM lives in.</li>
          <li>Press "Copy message for Claude" on any card below.</li>
          <li>Paste it into Claude and press Enter. Claude does the work and tells you when it is done.</li>
        </ol>
        <p className="mt-4 text-soft">Want something that is not on this page? Say it in your own words. Claude can read the whole CRM and change any part of it.</p>
      </Card>
      <Group feature className="rise rise-2" title="Works right now" intro="No building. Claude is already plugged into your CRM and can read and update it." items={askNow} />
      <Group className="rise rise-3" title="New features Claude can build" intro="Each one changes the CRM itself. Free, and usually done in a few minutes." items={builds} />
      <Group title="Bigger upgrades that need an account" intro="These connect to outside services. Claude walks you through each signup. Some cost a little money." items={accounts} />
    </>
  );
}
