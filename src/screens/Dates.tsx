import { upcomingDates } from "../../shared/logic.ts";
import { useCrm } from "../crm.ts";
import { PersonRow } from "../PersonRow.tsx";
import { Card, Chip, Empty, inDaysText } from "../ui.tsx";

export function Dates() {
  const { db, today } = useCrm();
  const soon = upcomingDates(db.people, today, 60);
  const byId = new Map(db.people.map((p) => [p.id, p]));
  const gifts = db.touches.filter((t) => t.kind === "gift").sort((a, b) => b.at.localeCompare(a.at)).slice(0, 20);
  return (
    <>
      <Card title="Coming up in the next 60 days" className="rise">
        {soon.length === 0
          ? <Empty title="No birthdays or dates coming up"><p>Add a birthday or anniversary on someone's page and it shows here before the day arrives.</p></Empty>
          : <ul>{soon.map((d) => (
              <PersonRow key={d.person.id + d.label} person={d.person} templateId={d.label === "Birthday" ? "birthday" : undefined}
                why={`${d.label} ${inDaysText(d.inDays)}${d.person.giftIdeas ? ` · Likes: ${d.person.giftIdeas.split("\n")[0]}` : ""}`}
                chip={<>{d.inDays <= 7 && <Chip tone="warn">This week</Chip>}{!d.person.address && <Chip>No address</Chip>}</>} />
            ))}</ul>}
      </Card>
      <Card title="Gifts you've sent" className="rise rise-2">
        {gifts.length === 0
          ? <Empty title="No gifts logged yet"><p>On someone's page, choose Gift under History and write what you sent.</p></Empty>
          : <ul>{gifts.map((g) => {
              const p = byId.get(g.personId);
              return p && <PersonRow key={g.id} person={p} why={`${new Date(g.at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · ${g.body || "Gift"}`} action={<span />} />;
            })}</ul>}
      </Card>
    </>
  );
}
