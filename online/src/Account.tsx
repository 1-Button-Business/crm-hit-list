// The extra card on the Settings screen of the hosted site.
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../convex/_generated/api";
import { presets } from "../../crm.config.ts";
import { Button, Card, Dialog, Pick } from "../../src/ui.tsx";

type Flavor = keyof typeof presets;

export function Account() {
  const me = useQuery(api.crm.me);
  const { signOut } = useAuthActions();
  const setFlavor = useMutation(api.crm.setFlavor);
  const deleteAccount = useMutation(api.crm.deleteAccount);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [type, setType] = useState("");
  if (!me?.signedIn) return null;
  const chosen = type || me.flavor;

  /** Do the work, then reload. `next` is where the reload should land. */
  async function run(work: () => Promise<unknown>, next = "") {
    if (busy) return;
    setBusy(true); setProblem("");
    try { await work(); window.location.hash = next; window.location.reload(); }
    catch { setProblem("That did not go through. Check your internet and try again."); setBusy(false); }
  }

  return (
    <Card title="Your account">
      <div className="grid gap-4">
        <p className="text-soft">Signed in as <span className="font-semibold text-ink">{me.email || "a test account"}</span>.</p>
        <div className="flex flex-wrap items-end gap-2">
          <Pick label="CRM type" value={chosen} disabled={busy} onChange={(e) => setType(e.target.value)}>
            {(Object.keys(presets) as Flavor[]).map((f) => <option key={f} value={f}>{presets[f].title}</option>)}
          </Pick>
          <Button disabled={busy || chosen === me.flavor} onClick={() => void run(() => setFlavor({ flavor: chosen as Flavor }), "/settings")}>Switch type</Button>
        </div>
        <p className="text-sm text-soft">Switching keeps all your people. Anyone in a stage the new type does not have moves to its first stage.</p>
        {problem && <p role="alert" className="font-semibold text-warn">{problem}</p>}
        <div className="flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => void run(() => signOut())}>Sign out</Button>
          <Button kind="quiet" disabled={busy} onClick={() => setAsking(true)}>Delete my account</Button>
        </div>
      </div>
      <Dialog open={asking} onClose={() => setAsking(false)} title="Delete your account?">
        <div className="grid gap-4">
          <p>This erases every person, note and conversation you saved here. It cannot be undone. Download your list first if you want to keep it.</p>
          <div className="flex flex-wrap gap-2">
            <Button data-autofocus onClick={() => setAsking(false)}>Keep my account</Button>
            <Button className="border-warn text-warn" disabled={busy} onClick={() => void run(async () => { await deleteAccount({}); sessionStorage.setItem("erased", "1"); })}>{busy ? "Erasing" : "Erase everything"}</Button>
          </div>
        </div>
      </Dialog>
    </Card>
  );
}
