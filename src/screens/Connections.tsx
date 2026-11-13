import { useMemo, useState } from "react";
import { isReachOut, matchEvents, parseIcs } from "../../shared/logic.ts";
import { SOURCES } from "../../shared/types.ts";
import type { Source, Touch, TouchKind } from "../../shared/types.ts";
import { config } from "../../crm.config.ts";
import { useCrm } from "../crm.ts";
import { connections } from "../recipes.ts";
import { Area, Button, Card, Chip, Empty, Field, Pick, plural, useOnce } from "../ui.tsx";
import { RecipeCard } from "./Grow.tsx";

type Row = Omit<Touch, "id">;
const KIND: Record<Source, TouchKind> = { calendar: "meeting", recorder: "meeting", texts: "text", email: "email" };
const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

/** Works with no Claude and no account: export your calendar, choose the file. */
function CalendarFile() {
  const { db, actions, say } = useCrm();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, once] = useOnce();

  async function read(file: File) {
    const pairs = matchEvents(parseIcs(await file.text()), db.people, new Date());
    setRows(pairs.map(({ event, person }) => ({
      personId: person.id, kind: "meeting", body: event.title || "Meeting", at: event.at,
      source: "calendar", ref: `cal:${event.uid || event.title + event.at}`,
    })));
  }
  const save = () => once(async () => {
    if (!rows?.length) return;
    try {
      const r = await actions.importTouches(rows);
      say(`Saved ${plural(r.added, "meeting")}.${r.skipped ? ` ${r.skipped} were already here.` : ""}`);
      setRows(null);
    } catch (e) { say(e instanceof Error ? e.message : "That did not save. Nothing was changed.", "warn"); }
  });
  const names = [...new Set((rows ?? []).map((r) => db.people.find((p) => p.id === r.personId)?.name))].slice(0, 4).join(", ");

  return (
    <Card title="Bring in a calendar file">
      <div className="grid gap-4">
        <p className="text-soft">In Google Calendar, Apple Calendar or Outlook, export your calendar. You get a file that ends in .ics. Choose it here and every past meeting with someone in your CRM is saved to their history.</p>
        <label className="grid gap-1 text-sm font-semibold text-soft">Choose a .ics file
          <input type="file" accept=".ics,text/calendar" className="min-h-12 w-full min-w-0 rounded-xl border border-line bg-surface p-2 text-base text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-raised file:px-3 file:py-2 file:font-semibold file:text-ink"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void read(f); e.target.value = ""; }} />
        </label>
        {rows && rows.length === 0 && <Empty title="No meetings matched anyone"><p>Meetings are matched by a guest's email or by the person's full name in the title. Add their email in the CRM, then try the file again.</p></Empty>}
        {rows && rows.length > 0 && (
          <div className="grid gap-3">
            <p role="status" className="font-semibold">Found {plural(rows.length, "meeting")} with {names}{rows.length > 4 ? " and more" : ""}.</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={save} disabled={busy}>{busy ? "Saving" : `Save ${plural(rows.length, "meeting")}`}</Button>
              <Button kind="quiet" onClick={() => setRows(null)}>Never mind</Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

/** Paste a thread, call notes or an email and file it under a person. */
function PasteOne() {
  const { db, actions, save, today } = useCrm();
  const [source, setSource] = useState<Source>("texts");
  const [personId, setPersonId] = useState("");
  const [day, setDay] = useState(today);
  const [body, setBody] = useState("");
  const [busy, once] = useOnce();
  const people = useMemo(() => [...db.people].sort((a, b) => a.name.localeCompare(b.name)), [db.people]);
  const ready = personId && body.trim() && /^\d{4}-\d{2}-\d{2}$/.test(day);

  const file = () => once(async () => {
    if (!ready) return;
    const [y, m, d] = day.split("-").map(Number);
    const at = new Date(y!, m! - 1, d!, 12).toISOString();
    if (await save(actions.importTouches([{ personId, kind: KIND[source], body: body.trim(), at, source }]), "Saved to their history.")) setBody("");
  });

  return (
    <Card title="Paste a conversation">
      <div className="grid gap-4">
        <p className="text-soft">Copy a text thread, an email or the notes from a call, and paste it here. It is saved under the person you pick.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Pick label="What is it?" value={source} onChange={(e) => setSource(e.target.value as Source)}>
            {(Object.keys(SOURCES) as Source[]).filter((s) => s !== "calendar").map((s) => <option key={s} value={s}>{SOURCES[s]}</option>)}
          </Pick>
          <Pick label={`Which ${config.personWord}?`} value={personId} onChange={(e) => setPersonId(e.target.value)}>
            <option value="">Pick someone</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Pick>
          <Field label="When was it?" type="date" value={day} max={today} onChange={(e) => setDay(e.target.value)} />
        </div>
        <Area label="Paste it here" rows={6} maxLength={60000} value={body} onChange={(e) => setBody(e.target.value)} />
        <Button onClick={file} disabled={busy || !ready} className="justify-self-start">{busy ? "Saving" : "Save to their history"}</Button>
      </div>
    </Card>
  );
}

export function Connections() {
  const { db } = useCrm();
  const [q, setQ] = useState("");
  const name = useMemo(() => new Map(db.people.map((p) => [p.id, p.name])), [db.people]);
  const all = useMemo(() => db.touches.filter(isReachOut).sort((a, b) => b.at.localeCompare(a.at)), [db.touches]);
  const count = (s: Source) => all.filter((t) => t.source === s).length;
  const words = q.trim().toLowerCase();
  const shown = all.filter((t) => !words || `${name.get(t.personId) ?? ""} ${t.body}`.toLowerCase().includes(words));

  return (
    <>
      <Card title="Connect the places you talk to people" className="rise">
        <p className="mb-4 text-soft">Claude does the connecting, so there are no passwords to type here. Press "Copy message for Claude", paste it into Claude, and it files each conversation under the right person. Run the same message any time to catch up. Nothing is saved twice.</p>
        <ul className="grid gap-4 md:grid-cols-2">
          {connections.map((c) => <RecipeCard key={c.source} r={c} chip={count(c.source) > 0 ? <Chip tone="good">{count(c.source)} saved</Chip> : <Chip>Not used yet</Chip>} />)}
        </ul>
      </Card>
      <div className="rise rise-2 grid items-start gap-4 lg:grid-cols-2">
        <CalendarFile />
        <PasteOne />
      </div>
      <Card title={`All conversations (${all.length})`} className="rise rise-3">
        <div className="grid gap-4">
          <Field label="Search what was said" type="search" value={q} onChange={(e) => setQ(e.target.value)} />
          {shown.length === 0
            ? <Empty title={all.length ? "Nothing matches that" : "No conversations yet"}><p>{all.length ? "Try a name or a different word." : "Log a reach-out, or connect one of the places above."}</p></Empty>
            : (
              <ul className="grid">
                {shown.slice(0, 50).map((t) => (
                  <li key={t.id} className="grid gap-1 border-t border-line py-3 first:border-t-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <a className="font-semibold underline" href={`#/person/${t.personId}`}>{name.get(t.personId) ?? "Someone"}</a>
                      <Chip>{t.kind}</Chip>
                      {t.source && t.source in SOURCES && <Chip tone="good">{SOURCES[t.source as Source]}</Chip>}
                      <span className="text-sm text-soft">{when(t.at)}</span>
                    </p>
                    {t.body && <p className="line-clamp-2 max-w-none text-soft">{t.body}</p>}
                  </li>
                ))}
              </ul>
            )}
          {shown.length > 50 && <p className="text-sm text-soft">Showing the newest 50 of {shown.length}. Search to narrow it down.</p>}
        </div>
      </Card>
    </>
  );
}
