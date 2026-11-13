import { referrers } from "../../shared/logic.ts";
import { useCrm } from "../crm.ts";
import { PersonRow } from "../PersonRow.tsx";
import { Button, Card, Chip, Empty, plural } from "../ui.tsx";

export function Referrals() {
  const { db, reach } = useCrm();
  const list = referrers(db.people, db.touches);
  const owed = list.filter((r) => r.thankYouOwed.length > 0);
  if (list.length === 0) {
    return <Empty title="No referrals tracked yet"><p>Open someone who was sent to you and choose who sent them. The person who sent them shows up here so you never forget a thank-you.</p></Empty>;
  }
  return (
    <>
      {owed.length > 0 && (
        <Card title="Thank-yous you owe" className="rise" action={<Chip tone="warn">{owed.length}</Chip>}>
          <ul>{owed.map((r) => <PersonRow key={r.person.id} person={r.person} why={`Sent you ${r.thankYouOwed.map((p) => p.name).join(", ")}`} action={<Button onClick={() => reach(r.person, "thanks")}>Say thanks</Button>} />)}</ul>
        </Card>
      )}
      <Card title="Who sends you people" className="rise rise-2">
        <ul>{list.map((r) => <PersonRow key={r.person.id} person={r.person} why={r.sent.map((p) => p.name).join(", ")} chip={<Chip>{plural(r.sent.length, "referral")}</Chip>} />)}</ul>
      </Card>
    </>
  );
}
