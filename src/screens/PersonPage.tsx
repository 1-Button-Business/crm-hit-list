import { useState } from "react";
import { Gift, Trash2 } from "lucide-react";
import { config } from "../../crm.config.ts";
import { addDays } from "../../shared/logic.ts";
import type { Person, Touch, TouchKind } from "../../shared/types.ts";
import { useCrm } from "../crm.ts";
import { kindLabel } from "../dialogs.tsx";
import { Area, Button, Card, Chip, Dialog, Empty, Field, Pick, btnClass, go, useOnce, useSaved } from "../ui.tsx";

/** A box that saves when you click away. A refused save keeps what you typed and says why. */
function Saved({ person, k, label, type, placeholder, area }: { person: Person; k: keyof Person; label: string; type?: string; placeholder?: string; area?: boolean }) {
  const { actions, say } = useCrm();
  const box = useSaved(String(person[k] ?? ""), (v) => actions.updatePerson(person.id, { [k]: v }), () => say("Saved"));
  return area
    ? <Area label={label} placeholder={placeholder} {...box} />
    : <Field label={label} type={type} placeholder={placeholder} autoComplete="off" {...box} />;
}

function Extra({ person, id, label, type, placeholder }: { person: Person; id: string; label: string; type?: string; placeholder?: string }) {
  const { actions, say } = useCrm();
  const box = useSaved(person.fields[id] ?? "", (v) => actions.updatePerson(person.id, { fields: { ...person.fields, [id]: v } }), () => say("Saved"));
  return <Field label={label} type={type} placeholder={placeholder} {...box} />;
}

const QUICK: [string, number][] = [["Tomorrow", 1], ["1 week", 7], ["1 month", 30], ["3 months", 90]];
const LOG_KINDS: TouchKind[] = ["note", "call", "text", "email", "dm", "meeting", "gift", "order"];

export function PersonPage({ id }: { id: string }) {
  const { db, actions, save, today, reach } = useCrm();
  const person = db.people.find((p) => p.id === id);
  const [kind, setKind] = useState<TouchKind>("note");
  const [body, setBody] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [dateValue, setDateValue] = useState("");
  const [tagText, setTagText] = useState("");
  const [confirming, setConfirming] = useState<"person" | Touch | null>(null);
  const [saving, once] = useOnce();

  if (!person) return <Empty title="That person is not in your CRM"><Button onClick={() => go("/people")}>Back to {config.peopleWord.toLowerCase()}</Button></Empty>;
  const update = (data: Partial<Person>, done = "Saved") => save(actions.updatePerson(person.id, data), done);
  const timeline = db.touches.filter((t) => t.personId === id).sort((a, b) => b.at.localeCompare(a.at));
  const sentBy = db.people.find((p) => p.id === person.referredById);
  const first = person.name.split(" ")[0];

  const log = () => once(async () => {
    if (!body.trim()) return;
    if (await save(actions.addTouch(person!.id, kind, body.trim()), kind === "note" ? "Note saved" : "Logged")) setBody("");
  });
  function addTag() {
    const t = tagText.trim();
    if (t && !person!.tags.includes(t)) void update({ tags: [...person!.tags, t] }, "Tag added");
    setTagText("");
  }
  const confirmDelete = () => once(async () => {
    if (!confirming) return;
    if (confirming === "person") {
      if (await save(actions.removePerson(person!.id), `${person!.name} deleted`)) go("/people");
    } else if (await save(actions.removeTouch(confirming.id), "Entry deleted")) setConfirming(null);
  });

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      {/* On a phone the follow-up, note and history come first. The contact boxes are below. */}
      <div className="grid min-w-0 gap-4 lg:order-2">
        <Card title="Next follow-up" action={person.followUpOn ? <Chip tone={person.followUpOn <= today ? "warn" : "plain"}>{person.followUpOn <= today ? "Due" : "Planned"}</Chip> : undefined}>
          <div className="grid gap-4">
            <div className="grid items-start gap-4 sm:grid-cols-2">
              <Saved person={person} k="followUpOn" label="Reach out on" type="date" />
              <Saved person={person} k="followUpNote" label="About what" placeholder="Send the pricing" />
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK.map(([label, n]) => <Button key={label} onClick={() => void update({ followUpOn: addDays(today, n) }, `Follow-up set for ${label.toLowerCase()}`)}>{label}</Button>)}
              {person.followUpOn && <Button kind="quiet" onClick={() => void update({ followUpOn: "", followUpNote: "" }, "Follow-up cleared")}>Clear</Button>}
            </div>
            <Button kind="primary" onClick={() => reach(person)} className="justify-self-start">Reach out to {first} now</Button>
          </div>
        </Card>

        <Card title="What to remember">
          <Saved person={person} k="about" label="Pinned note" area placeholder="Family, goals, what they care about, how they like to be reached" />
        </Card>

        <Card title="History">
          <div className="grid gap-4">
            <form className="grid gap-2 rounded-xl bg-raised p-3" onSubmit={(e) => { e.preventDefault(); void log(); }}>
              <div className="grid items-start gap-2 sm:grid-cols-[10rem_1fr]">
                <Pick label="Type" value={kind} onChange={(e) => setKind(e.target.value as TouchKind)}>
                  {LOG_KINDS.map((k) => <option key={k} value={k}>{kindLabel(k)}</option>)}
                </Pick>
                <Area label="What happened" rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder={kind === "gift" ? "What you sent" : kind === "order" ? "What they ordered" : "What you talked about"} />
              </div>
              <Button type="submit" className="justify-self-start" disabled={saving || !body.trim()}>{saving ? "Saving" : "Save to history"}</Button>
            </form>
            {timeline.length === 0
              ? <Empty title="Nothing here yet"><p>Notes, calls, texts, gifts and orders with {first} will stack up here, newest first.</p></Empty>
              : <ol className="grid gap-3">{timeline.map((t) => (
                  <li key={t.id} className="grid grid-cols-[1fr_auto] items-start gap-2 border-t border-line pt-3 first:border-t-0 first:pt-0">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm text-soft"><Chip>{kindLabel(t.kind)}</Chip>{new Date(t.at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
                      {t.body && <p className="mt-1 max-w-none break-words whitespace-pre-wrap">{t.body}</p>}
                    </div>
                    <Button kind="quiet" aria-label="Delete this entry" title="Delete this entry" onClick={() => setConfirming(t)}><Trash2 size={20} aria-hidden /></Button>
                  </li>
                ))}</ol>}
          </div>
        </Card>
      </div>

      <div className="grid min-w-0 gap-4 lg:order-1">
        <Card title="Details">
          <div className="grid gap-4">
            <Pick label="Stage" value={person.stage} onChange={(e) => void update({ stage: e.target.value }, "Stage changed")}>
              {config.stages.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </Pick>
            <Saved person={person} k="name" label="Name" />
            <Saved person={person} k="phone" label="Phone" type="tel" />
            <Saved person={person} k="email" label="Email" type="email" />
            <Saved person={person} k="company" label="Company" />
            <Saved person={person} k="source" label="Where they came from" placeholder="Instagram DM, referral, event" />
            <Pick label="Who sent them to you" value={person.referredById} onChange={(e) => void update({ referredById: e.target.value })}>
              <option value="">Nobody yet</option>
              {db.people.filter((p) => p.id !== id).sort((a, b) => a.name.localeCompare(b.name)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Pick>
            {sentBy && <a className="font-semibold underline" href={`#/person/${sentBy.id}`}>Open {sentBy.name}</a>}
            {config.fields.map((f) => <Extra key={f.id} person={person} id={f.id} label={f.label} type={f.type} placeholder={f.placeholder} />)}
          </div>
        </Card>

        <Card title="Dates and gifts">
          <div className="grid gap-4">
            <Saved person={person} k="birthday" label="Birthday" placeholder="Month and day, like 3/14" />
            {person.dates.map((d, i) => (
              <div key={d.label + i} className="flex items-center justify-between gap-2 rounded-xl bg-raised px-3 py-2">
                <span><span className="font-semibold">{d.label}</span> <span className="text-soft">{d.date}</span></span>
                <Button kind="quiet" aria-label={`Remove ${d.label}`} title={`Remove ${d.label}`} onClick={() => void update({ dates: person.dates.filter((_, j) => j !== i) }, "Date removed")}>✕</Button>
              </div>
            ))}
            <form className="grid grid-cols-2 items-start gap-2" onSubmit={(e) => { e.preventDefault(); if (dateLabel.trim() && dateValue) void update({ dates: [...person.dates, { label: dateLabel.trim(), date: dateValue }] }, "Date added").then((ok) => { if (ok) { setDateLabel(""); setDateValue(""); } }); }}>
              <Field label="Another date" placeholder="Anniversary" value={dateLabel} onChange={(e) => setDateLabel(e.target.value)} />
              <Field label="When" type="date" value={dateValue} onChange={(e) => setDateValue(e.target.value)} />
              <Button type="submit" className="col-span-2" disabled={!dateLabel.trim() || !dateValue}>Add date</Button>
            </form>
            <Saved person={person} k="address" label="Mailing address" area placeholder="Street, city, state, zip" />
            <Saved person={person} k="giftIdeas" label="Gift ideas" area placeholder="Things they love. First line is used to shop." />
            <a className={btnClass()} target="_blank" rel="noreferrer" href={`https://www.amazon.com/s?k=${encodeURIComponent(person.giftIdeas.split("\n")[0] || "thank you gift")}`}><Gift size={20} aria-hidden />Shop gifts on Amazon</a>
          </div>
        </Card>

        <Card title="Tags">
          <div className="grid gap-4">
            {person.tags.length > 0 && <div className="flex flex-wrap gap-2">{person.tags.map((t) => (
              <button key={t} onClick={() => void update({ tags: person.tags.filter((x) => x !== t) }, `Tag "${t}" removed. Type it again to put it back.`)} aria-label={`Remove tag ${t}`} title={`Remove tag ${t}`} className="inline-flex min-h-12 items-center gap-2 rounded-full border border-line px-4 font-semibold hover:border-soft">{t} ✕</button>
            ))}</div>}
            <form className="grid grid-cols-[1fr_auto] items-end gap-2" onSubmit={(e) => { e.preventDefault(); addTag(); }}>
              <Field label="Add a tag" placeholder="VIP, BNI, spring buyer" value={tagText} onChange={(e) => setTagText(e.target.value)} />
              <Button type="submit" disabled={!tagText.trim()}>Add</Button>
            </form>
          </div>
        </Card>

        <Button onClick={() => setConfirming("person")} className="justify-self-start text-warn"><Trash2 size={20} aria-hidden />Delete {first}</Button>
      </div>

      <Dialog open={confirming !== null} onClose={() => setConfirming(null)} title={confirming === "person" ? `Delete ${person.name}?` : "Delete this entry?"}>
        <p className="text-soft">{confirming === "person"
          ? `This removes ${first} and their whole history. Yesterday's backup still has them if you change your mind.`
          : `This removes one ${confirming ? kindLabel(confirming.kind).toLowerCase() : "entry"} from ${first}'s history.`}</p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setConfirming(null)}>Keep it</Button>
          <Button className="text-warn" disabled={saving} onClick={() => void confirmDelete()}>{saving ? "Deleting" : "Yes, delete"}</Button>
        </div>
      </Dialog>
    </div>
  );
}
