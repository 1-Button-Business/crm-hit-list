// crm.1buttonbusiness.com/admin: how every member is doing. For the emails in ADMIN_EMAILS only.
// Open shows a member's whole CRM, read only.
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../convex/_generated/api";
import { Button, Card, Chip } from "../../src/ui.tsx";

const day = (iso: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "never");

function MemberCrm({ email, onClose }: { email: string; onClose: () => void }) {
  const crm = useQuery(api.admin.memberCrm, { email });
  return (
    <Card title={email} action={<Button kind="quiet" onClick={onClose}>Close</Button>}>
      {crm === undefined ? <p role="status" className="text-soft">Opening</p> : (
        <div className="grid gap-4">
          <p>{crm.people.length} people · {crm.touches.length} conversations · {crm.processes.length} processes · {crm.cards.length} dashboard cards</p>
          {crm.processes.length > 0 && <ul className="grid gap-2">{crm.processes.map((p) => <li key={p.name} className="rounded-xl bg-raised p-3"><b>{p.name}</b>{p.when && <span className="text-soft"> · {p.when}</span>}<p className="text-sm">{p.steps}</p></li>)}</ul>}
          <ul className="grid gap-1">{crm.people.slice(0, 200).map((p) => <li key={p.id} className="flex flex-wrap justify-between gap-2 border-t border-line py-2"><span>{p.name}{p.company && <span className="text-soft"> · {p.company}</span>}</span><span className="text-sm text-soft">{p.stage}{p.followUpOn && ` · follow up ${p.followUpOn}`}</span></li>)}</ul>
        </div>
      )}
    </Card>
  );
}

export function Admin() {
  const ok = useQuery(api.admin.amAdmin);
  const rows = useQuery(api.admin.members, ok ? {} : "skip");
  const [open, setOpen] = useState("");
  if (ok === undefined) return <p role="status" className="p-6 text-soft">Checking</p>;
  if (!ok) return <main className="mx-auto max-w-3xl p-6"><Card title="Admins only"><p>This page is for the 1BB team. <a className="font-semibold underline" href="/">Go to your CRM</a></p></Card></main>;
  const joined = rows?.filter((r) => r.joined).length ?? 0;
  const withClaude = rows?.filter((r) => r.claude).length ?? 0;
  return (
    <main className="mx-auto grid max-w-6xl gap-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">1BB CRM members</h1>
        <a className="font-semibold underline" href="/">Back to my CRM</a>
      </header>
      {rows === undefined ? <p role="status" className="text-soft">Loading members</p> : (
        <>
          <p className="text-soft">{rows.length} on the list · {joined} signed in · {withClaude} connected Claude.</p>
          {open && <MemberCrm email={open} onClose={() => setOpen("")} />}
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead className="bg-raised"><tr>{["Member", "Type", "People", "Talks", "Setup", "Claude", "Dashboard", "Last active", ""].map((h) => <th key={h} scope="col" className="p-3 font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.email} className="border-t border-line">
                    <td className="p-3">{r.email}</td>
                    <td className="p-3">{r.joined ? (r.type || "not picked") : <Chip>not signed in</Chip>}</td>
                    <td className="p-3 tabular-nums">{r.people}</td>
                    <td className="p-3 tabular-nums">{r.conversations}</td>
                    <td className="p-3 tabular-nums">{r.setupDone}/{r.setupTotal}</td>
                    <td className="p-3">{r.claude ? `yes, ${day(r.claudeLastUsed)}` : "no"}</td>
                    <td className="p-3 tabular-nums">{r.cards}</td>
                    <td className="p-3">{day(r.lastActive)}</td>
                    <td className="p-3">{r.joined && <Button onClick={() => setOpen(r.email)}>Open</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
