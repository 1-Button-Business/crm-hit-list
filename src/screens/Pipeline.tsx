import { config } from "../../crm.config.ts";
import { lastReachOutByPerson, quietFor } from "../../shared/logic.ts";
import { useCrm } from "../crm.ts";
import { Button, Empty, ago } from "../ui.tsx";

export function Pipeline() {
  const { db, actions, save, today } = useCrm();
  const last = lastReachOutByPerson(db.touches);
  if (db.people.length === 0) return <Empty title="Your pipeline is empty"><p>Add people and they line up here by stage.</p></Empty>;
  return (
    <div className="-mx-3 overflow-x-auto px-3 pb-2 sm:mx-0 sm:px-0" tabIndex={0} role="region" aria-label="Pipeline, scroll sideways for more stages">
      <div className="flex gap-4">
        {config.stages.map((s, at) => {
          const nextStage = config.stages[at + 1];
          const here = db.people.filter((p) => p.stage === s.id).sort((a, b) => quietFor(b, last, today) - quietFor(a, last, today));
          return (
            <section key={s.id} className="grid min-w-48 flex-1 content-start gap-2 rounded-2xl border border-line bg-surface p-3">
              <h2 className="flex items-center justify-between px-1 text-base">{s.label}<span className="text-sm text-soft">{here.length}</span></h2>
              {here.length === 0 && <p className="rounded-xl border border-dashed border-line p-3 text-sm text-soft">Nobody here</p>}
              {here.map((p) => (
                <article key={p.id} className="grid gap-2 rounded-xl bg-raised p-3">
                  <a href={`#/person/${p.id}`} className="font-semibold hover:text-accent">{p.name}</a>
                  <p className="text-sm text-soft">{last.has(p.id) ? `Reached out ${ago(quietFor(p, last, today))}` : "No reach-out yet"}</p>
                  {nextStage && !nextStage.rest && <Button aria-label={`Move ${p.name} to ${nextStage.label}`} onClick={() => void save(actions.updatePerson(p.id, { stage: nextStage.id }), `${p.name} moved to ${nextStage.label}`)}>Move to {nextStage.label}</Button>}
                  <select aria-label={`Move ${p.name} to another stage`} className="select h-12 rounded-xl border border-line bg-surface px-3 text-base text-ink" value=""
                    onChange={(e) => e.target.value && void save(actions.updatePerson(p.id, { stage: e.target.value }), `${p.name} moved`)}>
                    <option value="">Another stage</option>
                    {config.stages.filter((x) => x.id !== p.stage).map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
                  </select>
                </article>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
