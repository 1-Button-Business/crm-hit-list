// Hosted-only screens for the Claude connection: the "Connect Claude" card on Settings
// and the member's own dashboard on Today. Each member's cards and links are theirs alone.
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { api } from "../convex/_generated/api";
import { Button, Card, Chip } from "../../src/ui.tsx";

/** Where Claude connects. On a live site (1BB's or a member's own) it is the site's own address, which passes it on; on this computer, Convex directly. */
const mcpBase = () => !["localhost", "127.0.0.1"].includes(location.hostname)
  ? `${location.origin}/mcp/`
  : `${(import.meta.env.VITE_CONVEX_URL as string).replace(".convex.cloud", ".convex.site")}/mcp/`;

const STARTER = "Set up my 1BB CRM";

function Copy({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button onClick={() => { void navigator.clipboard.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 2000); }); }}>
      {done ? "Copied" : label}
    </Button>
  );
}

export function ConnectClaude() {
  const keys = useQuery(api.claude.keys);
  const makeKey = useMutation(api.claude.makeKey);
  const removeKey = useMutation(api.claude.removeKey);
  const notes = useQuery(api.claude.processes);
  const removeProcess = useMutation(api.claude.removeProcess);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  async function make() {
    if (busy) return;
    setBusy(true); setProblem("");
    try { setLink(mcpBase() + (await makeKey({ label: "Claude" })).key); }
    catch (e) { setProblem(e instanceof Error && e.message.includes("Remove one") ? `You have the most links allowed. Remove an old one below first.` : "That did not go through. Check your internet and try again."); }
    finally { setBusy(false); }
  }

  return (
    <Card title="Connect Claude">
      <div className="grid gap-4">
        <p>Let your own Claude run this CRM for you. It can bring in your people from another CRM, your texts and your email, add fields, save how you work, and fill your dashboard from Stripe, HubSpot or QuickBooks.</p>
        {!link && <Button kind="primary" className="justify-self-start" disabled={busy} onClick={() => void make()}>{busy ? "Making your link" : "Make my Claude link"}</Button>}
        {link && (
          <div className="grid gap-3 rounded-xl bg-raised p-4">
            <p className="font-semibold">Your private link. Copy it now: it is shown only once.</p>
            <p className="break-all rounded-lg bg-bg p-3 font-mono text-sm">{link}</p>
            <div className="flex flex-wrap gap-2"><Copy text={link} label="Copy link" /></div>
            <ol className="ml-6 grid list-decimal gap-1">
              <li>In Claude, open <b>Customize</b>, then <b>Connectors</b>.</li>
              <li>Tap <b>Add</b>, then <b>Add custom connector</b>.</li>
              <li>Name it <b>1BB CRM</b>, paste the link, tap <b>Continue</b>.</li>
              <li>Claude shows <b>No sign-in</b>. Tap <b>Add</b>, then <b>Connect</b>.</li>
              <li>Start a new chat and say <b>"{STARTER}"</b>. Tap <b>Allow</b> when Claude asks to use it.</li>
            </ol>
            <p className="text-sm text-soft">Treat this link like a key: anyone who has it can use your CRM. Never post it. If it leaks, remove it below and make a new one.</p>
          </div>
        )}
        {problem && <p role="alert" className="font-semibold text-warn">{problem}</p>}
        {keys && keys.length > 0 && (
          <div className="grid gap-2">
            <p className="font-semibold">Your links</p>
            <ul className="grid gap-2">
              {keys.map((k) => (
                <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-raised p-3">
                  <span>Ends in <span className="font-mono">{k.hint}</span> · {k.lastUsedAt ? `last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : "not used yet"}</span>
                  <Button kind="quiet" onClick={() => void removeKey({ id: k.id })}>Remove</Button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {notes && notes.length > 0 && (
          <div className="grid gap-2">
            <p className="font-semibold">How you work</p>
            <p className="text-sm text-soft">Notes your Claude saved from your chats. It reads them as background, never as orders.</p>
            <ul className="grid gap-2">
              {notes.map((n) => (
                <li key={n.id} className="flex flex-wrap items-start justify-between gap-2 rounded-xl bg-raised p-3">
                  <span className="grid gap-1"><b>{n.name}</b>{n.when && <span className="text-sm text-soft">{n.when}</span>}<span className="text-sm">{n.steps}</span></span>
                  <Button kind="quiet" onClick={() => void removeProcess({ id: n.id })}>Remove</Button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

const ago = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
};

export function Dashboard() {
  const cards = useQuery(api.claude.cards);
  const removeCard = useMutation(api.claude.removeCard);
  if (cards === undefined) return null;
  return (
    <Card title="Your dashboard" className="rise">
      {cards.length === 0 ? (
        <div className="grid gap-3">
          <p>Your numbers from the tools you already use, in one place. Your Claude fills these in.</p>
          <p className="text-soft">Connect Stripe, QuickBooks, HubSpot, Shopify or Square in Claude under Customize, then Connectors. Then say <b className="text-ink">"Add my Stripe numbers to my CRM dashboard."</b></p>
          <a className="font-semibold underline justify-self-start" href="#/settings">Connect Claude</a>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <li key={c.id} className="grid content-start gap-1 rounded-xl bg-raised p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-soft">{c.title}</p>
                <Chip>{c.source}</Chip>
              </div>
              <p className="text-3xl font-semibold tabular-nums text-accent">{c.value}</p>
              {c.note && <p className="text-sm text-soft">{c.note}</p>}
              <div className="flex items-center justify-between gap-2 pt-1 text-sm text-soft">
                <span>Updated {ago(c.updatedAt)}</span>
                <span className="flex gap-1">
                  {c.link && <a className="inline-grid size-12 place-items-center" href={c.link} target="_blank" rel="noreferrer" aria-label={`Open ${c.source} (opens in a new tab)`} title={`Open ${c.source}`}><ExternalLink size={18} aria-hidden /></a>}
                  <Button kind="quiet" aria-label={`Remove the ${c.title} card`} title="Remove this card" onClick={() => void removeCard({ id: c.id })}><Trash2 size={18} aria-hidden /></Button>
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
