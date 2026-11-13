import { useState } from "react";
import { Flame } from "lucide-react";
import { config, restStages } from "../../crm.config.ts";
import { dueFollowUps, quietPeople, reachOutsOn, streak, upcomingDates } from "../../shared/logic.ts";
import { useCrm } from "../crm.ts";
import { PersonRow } from "../PersonRow.tsx";
import { samplePeople } from "../sample.ts";
import { Button, Card, Chip, Empty, Field, go, inDaysText, plural } from "../ui.tsx";

function Ring({ done, goal }: { done: number; goal: number }) {
  const r = 44, c = 2 * Math.PI * r;
  const part = goal > 0 ? Math.min(done / goal, 1) : 0;
  return (
    <svg viewBox="0 0 100 100" className="size-32 shrink-0" role="img" aria-label={`${done} of ${goal} reach-outs done today`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--raised)" strokeWidth="10" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={part >= 1 ? "var(--good)" : "var(--accent)"} strokeWidth="10" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - part)} transform="rotate(-90 50 50)" className="ring-progress" />
      <text x="50" y="54" textAnchor="middle" fontSize="24" fontWeight="600" fill="currentColor">{done}</text>
      <text x="50" y="68" textAnchor="middle" fontSize="10" fill="var(--soft)">of {goal}</text>
    </svg>
  );
}

function Welcome() {
  const { db, actions, save, today, addPerson } = useCrm();
  const [busy, setBusy] = useState(false);
  const [biz, setBiz] = useState(db.settings.businessName);
  const [me, setMe] = useState(db.settings.yourName);
  async function loadSample() {
    if (busy) return;
    setBusy(true);
    await save(actions.importPeople(samplePeople(today)), "Sample people added. Click around.");
    setBusy(false);
  }
  return (
    <Card title="Welcome. Let's set up your CRM." className="rise">
      <div className="grid gap-6">
        <p className="text-soft">This is your {config.title}. It lives on your computer, and nobody else can see it. Start with two quick answers.</p>
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <Field label="Your business name" value={biz} onChange={(e) => setBiz(e.target.value)} onBlur={() => biz !== db.settings.businessName && void save(actions.updateSettings({ businessName: biz }), "Saved")} />
          <Field label="Your first name" hint="Used to sign your messages." value={me} onChange={(e) => setMe(e.target.value)} onBlur={() => me !== db.settings.yourName && void save(actions.updateSettings({ yourName: me }), "Saved")} />
        </div>
        <div className="grid gap-2">
          <p className="font-semibold">Now add people. Pick one:</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={addPerson}>Add one {config.personWord}</Button>
            <Button onClick={() => go("/import")}>Import a list</Button>
            <Button onClick={loadSample} disabled={busy}>{busy ? "Adding" : "Load sample people"}</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function Today() {
  const { db, today } = useCrm();
  const { people, touches, settings } = db;
  if (people.length === 0) return <Welcome />;

  const done = reachOutsOn(touches, today);
  const run = streak(touches, settings.dailyGoal, today);
  const due = dueFollowUps(people, today);
  const dates = upcomingDates(people, today, 7);
  const dueIds = new Set(due.map((p) => p.id));
  const quiet = quietPeople(people, touches, settings.quietDays, today, restStages).filter((q) => !dueIds.has(q.person.id));
  const left = Math.max(settings.dailyGoal - done, 0);
  const hello = settings.yourName ? `, ${settings.yourName}` : "";

  return (
    <>
      <Card className="goal-card rise">
        <div className="flex flex-wrap items-center gap-6">
          <Ring done={done} goal={settings.dailyGoal} />
          <div className="grid min-w-0 flex-1 basis-60 gap-2">
            <h2 className="text-2xl">{left === 0 && settings.dailyGoal > 0 ? `Goal hit${hello}. Nice work.` : `${plural(left, "reach-out")} to go today${hello}`}</h2>
            <p className="text-soft">Your goal is {settings.dailyGoal} a day. Calls, texts, emails, DMs and meetings all count.</p>
            {run > 0 && <p className="flex items-center gap-2 font-semibold text-warn"><Flame size={20} aria-hidden />{plural(run, "day")} in a row</p>}
          </div>
        </div>
      </Card>

      <Card title="Follow up today" className="rise rise-2" action={due.length > 0 && <Chip tone="warn">{due.length} due</Chip>}>
        {due.length === 0
          ? <Empty title="Nothing due. You're caught up."><p>Set a follow-up date on anyone's page and they show up here on that day.</p></Empty>
          : <ul>{due.map((p) => <PersonRow key={p.id} person={p} why={p.followUpNote || "Follow-up is due"} chip={p.followUpOn < today && <Chip tone="warn">Late</Chip>} />)}</ul>}
      </Card>

      {dates.length > 0 && (
        <Card title="Birthdays and dates this week" className="rise rise-2" action={<a className="font-semibold underline" href="#/dates">See all</a>}>
          <ul>{dates.map((d) => <PersonRow key={d.person.id + d.label} person={d.person} why={`${d.label} ${inDaysText(d.inDays)}`} templateId={d.label === "Birthday" ? "birthday" : undefined} />)}</ul>
        </Card>
      )}

      <Card title="Haven't talked in a while" className="rise rise-3" action={quiet.length > 5 && <a className="font-semibold underline" href="#/people/quiet">See all {quiet.length}</a>}>
        {quiet.length === 0
          ? <Empty title={`Nobody has gone quiet for ${settings.quietDays} days.`} />
          : <ul>{quiet.slice(0, 5).map((q) => <PersonRow key={q.person.id} person={q.person} why={`${q.days} days since you reached out`} templateId="quiet" />)}</ul>}
      </Card>
    </>
  );
}
