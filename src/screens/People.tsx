import { useState } from "react";
import { config, restStages } from "../../crm.config.ts";
import { lastReachOutByPerson, quietFor, quietPeople } from "../../shared/logic.ts";
import { useCrm } from "../crm.ts";
import { PersonRow } from "../PersonRow.tsx";
import { Button, Card, Chip, Empty, Field, Pick, ago, go, plural } from "../ui.tsx";

export function People({ query }: { query: string }) {
  const { db, today, addPerson } = useCrm();
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [tag, setTag] = useState("");
  const quietOnly = query === "quiet";
  // Filters start open on a wide screen and tucked away on a phone.
  const [wide] = useState(() => window.matchMedia("(min-width: 64rem)").matches);

  const last = lastReachOutByPerson(db.touches);
  const quietIds = new Set(quietPeople(db.people, db.touches, db.settings.quietDays, today, restStages).map((q) => q.person.id));
  const tags = [...new Set(db.people.flatMap((p) => p.tags))].sort();
  const words = search.toLowerCase().trim();
  const shown = db.people
    .filter((p) => !stage || p.stage === stage)
    .filter((p) => !tag || p.tags.includes(tag))
    .filter((p) => !quietOnly || quietIds.has(p.id))
    .filter((p) => !words || [p.name, p.email, p.phone, p.company, p.source, p.about, ...p.tags].join(" ").toLowerCase().includes(words))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (db.people.length === 0) {
    return <Empty title={`No ${config.peopleWord.toLowerCase()} yet`}><p>Add your first one, or bring in a whole list at once.</p><div className="flex flex-wrap gap-2"><Button onClick={addPerson}>Add a {config.personWord}</Button><Button onClick={() => go("/import")}>Import a list</Button></div></Empty>;
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <Card className="lg:sticky lg:top-4">
        <div className="grid gap-4">
          <Field label="Search" type="search" placeholder="Name, phone, note" value={search} onChange={(e) => setSearch(e.target.value)} />
          <details open={wide || undefined}>
          <summary className="flex min-h-12 items-center justify-between rounded-xl border border-line px-4 font-semibold lg:hidden">Filters<span className="text-sm text-soft">{[stage, tag, quietOnly].filter(Boolean).length} on ▾</span></summary>
          <div className="grid gap-4 pt-4 lg:pt-0">
          <Pick label="Stage" value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="">All stages</option>
            {config.stages.map((s) => <option key={s.id} value={s.id}>{s.label} ({db.people.filter((p) => p.stage === s.id).length})</option>)}
          </Pick>
          {tags.length > 0 && (
            <Pick label="Tag" value={tag} onChange={(e) => setTag(e.target.value)}>
              <option value="">All tags</option>
              {tags.map((t) => <option key={t}>{t}</option>)}
            </Pick>
          )}
          <label className="flex min-h-12 items-center gap-3 font-semibold">
            <input type="checkbox" className="size-6 accent-(--accent)" checked={quietOnly} onChange={(e) => go(e.target.checked ? "/people/quiet" : "/people")} />
            Only people I haven't talked to in {db.settings.quietDays} days
          </label>
          </div>
          </details>
        </div>
      </Card>
      <Card title={plural(shown.length, config.personWord === "person" ? "person" : config.personWord, config.peopleWord.toLowerCase())}>
        {shown.length === 0
          ? <Empty title="Nobody matches that"><Button onClick={() => { setSearch(""); setStage(""); setTag(""); go("/people"); document.querySelector<HTMLInputElement>("input[type=search]")?.focus(); }}>Clear filters</Button></Empty>
          : <ul>{shown.map((p) => {
              const days = quietFor(p, last, today);
              return <PersonRow key={p.id} person={p} why={`${config.stages.find((s) => s.id === p.stage)?.label ?? "No stage"} · ${last.has(p.id) ? `reached out ${ago(days)}` : `added ${ago(days)}`}`} chip={quietIds.has(p.id) && <Chip tone="warn">Quiet</Chip>} />;
            })}</ul>}
      </Card>
    </div>
  );
}
