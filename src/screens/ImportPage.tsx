import { useState } from "react";
import { parseCsv, rowsToPeople } from "../../shared/logic.ts";
import { config } from "../../crm.config.ts";
import { useCrm } from "../crm.ts";
import { Area, Button, Card, Empty, go, plural } from "../ui.tsx";

export function ImportPage() {
  const { actions, say } = useCrm();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);
  const found = text.trim() ? rowsToPeople(parseCsv(text)) : [];

  async function run() {
    if (busy || found.length === 0) return;
    setBusy(true);
    try { setResult(await actions.importPeople(found)); setText(""); }
    catch (e) { say(e instanceof Error ? e.message : "The import did not work. Nothing was changed.", "warn"); }
    setBusy(false);
  }

  return (
    <>
      <Card title="Bring in a list" className="rise">
        <div className="grid gap-4">
          <p className="text-soft">Export a spreadsheet from ManyChat, a Google Form, your email tool or your old CRM. Choose the file here, or open it and paste everything into the box. The first row has to be the column names.</p>
          <label className="grid gap-1 text-sm font-semibold text-soft">Choose a .csv file
            <input type="file" accept=".csv,text/csv,text/plain" className="min-h-12 w-full min-w-0 rounded-xl border border-line bg-surface p-2 text-base text-ink file:mr-3 file:rounded-lg file:border-0 file:bg-raised file:px-3 file:py-2 file:font-semibold file:text-ink"
              onChange={async (e) => { const f = e.target.files?.[0]; if (f) { setResult(null); setText(await f.text()); } }} />
          </label>
          <Area label="Or paste it here" rows={6} value={text} onChange={(e) => { setResult(null); setText(e.target.value); }} placeholder={"Name,Email,Phone\nJane Doe,jane@example.com,555-0100"} />
          {result && <p role="status" className="font-semibold text-good">Added {plural(result.added, "person", "people")}.{result.skipped > 0 && ` Skipped ${result.skipped} already in your CRM.`} <a className="underline" href="#/people">See them</a></p>}
          {text.trim().split("\n").length > 1 && found.length === 0 && <Empty title="Could not find any people in that"><p>Make sure the first row has column names like Name, Email and Phone.</p></Empty>}
        </div>
      </Card>
      {found.length > 0 && (
        <Card title={`Found ${plural(found.length, "person", "people")}. Does this look right?`} className="rise">
          <div className="grid gap-4">
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Import preview">
              <table className="w-full text-left">
                <thead><tr className="text-sm text-soft">{["Name", "Email", "Phone", "Notes"].map((h) => <th key={h} className="p-2 font-semibold">{h}</th>)}</tr></thead>
                <tbody>{found.slice(0, 5).map((p, i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="p-2 font-semibold">{p.name}</td><td className="p-2">{p.email}</td><td className="p-2">{p.phone}</td>
                    <td className="max-w-60 truncate p-2 text-soft">{p.about}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            {found.length > 5 && <p className="text-sm text-soft">Showing the first 5 of {found.length}.</p>}
            <p className="text-soft">Everyone starts in "{config.stages.find((s) => s.id === config.firstStage)?.label}". Anyone whose email is already in your CRM is skipped.</p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={run} disabled={busy}>{busy ? "Importing" : `Import ${plural(found.length, "person", "people")}`}</Button>
              <Button kind="quiet" onClick={() => setText("")}>Start over</Button>
            </div>
          </div>
        </Card>
      )}
      <Card title="Messy file?">
        <p className="text-soft">If the columns do not line up, let Claude do it. Drag the file into Claude and say: "Import this into my CRM."</p>
        <Button className="mt-4" onClick={() => go("/grow")}>See what else Claude can do</Button>
      </Card>
    </>
  );
}
