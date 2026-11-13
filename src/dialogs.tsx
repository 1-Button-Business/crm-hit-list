import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Copy, Mail, MessageSquare, Phone } from "lucide-react";
import { config } from "../crm.config.ts";
import { addDays, fillTemplate } from "../shared/logic.ts";
import type { Person, TouchKind } from "../shared/types.ts";
import { useCrm } from "./crm.ts";
import { Area, Button, Dialog, Field, Pick, btnClass, useOnce } from "./ui.tsx";

const KIND_LABEL: Record<TouchKind, string> = {
  text: "Text", call: "Call", email: "Email", dm: "DM", meeting: "In person",
  gift: "Gift", order: "Order", note: "Note",
};
export const kindLabel = (k: TouchKind) => KIND_LABEL[k];

export function AddPersonDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { actions, save } = useCrm();
  const blank = { name: "", phone: "", email: "", source: "", stage: config.firstStage };
  const [form, setForm] = useState(blank);
  const [saving, once] = useOnce();
  const set = (k: keyof typeof blank) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  function submit(e: FormEvent) {
    e.preventDefault();
    // On a failed save the form keeps what you typed.
    void once(async () => { if (await save(actions.addPerson(form), `${form.name.trim()} added`)) { setForm(blank); onClose(); } });
  }

  return (
    <Dialog open={open} onClose={onClose} title={`Add a ${config.personWord}`}>
      <form onSubmit={submit} className="grid gap-4">
        <Field label="Name" value={form.name} onChange={set("name")} required data-autofocus autoComplete="off" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" type="tel" value={form.phone} onChange={set("phone")} autoComplete="off" />
          <Field label="Email" type="email" value={form.email} onChange={set("email")} autoComplete="off" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Where they came from" placeholder="Instagram DM, referral, event" value={form.source} onChange={set("source")} />
          <Pick label="Stage" value={form.stage} onChange={set("stage")}>
            {config.stages.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </Pick>
        </div>
        <Button kind="primary" type="submit" disabled={saving}>{saving ? "Saving" : `Add ${config.personWord}`}</Button>
      </form>
    </Dialog>
  );
}

/** Write a message, send it from your own phone or email app, then log it. */
export function ReachOutDialog({ person, templateId, onClose }: { person: Person | null; templateId?: string; onClose: () => void }) {
  const { db, actions, save, say, today } = useCrm();
  const [next, setNext] = useState("0");
  const [tpl, setTpl] = useState("");
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<TouchKind>("text");
  const [saving, once] = useOnce();
  /** The last message we filled in for them, so we know if they changed it. */
  const filled = useRef("");

  useEffect(() => {
    if (!person) return;
    const t = config.templates.find((x) => x.id === templateId);
    setTpl(t?.id ?? "");
    filled.current = t ? fillTemplate(t.body, person, db.settings) : "";
    setBody(filled.current);
    setKind(person.phone ? "text" : person.email ? "email" : "dm");
    setNext("0");
    // Only when a different person or message is opened, not on every data refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person?.id, templateId]);

  if (!person) return <Dialog open={false} onClose={onClose} title="Reach out">{null}</Dialog>;
  const first = person.name.split(" ")[0];
  const subject = config.templates.find((t) => t.id === tpl)?.subject ?? "";
  const enc = encodeURIComponent;

  function pickTemplate(id: string) {
    const t = config.templates.find((x) => x.id === id);
    const typedTheirOwn = body.trim() && body !== filled.current;
    if (t && typedTheirOwn && !window.confirm("Replace what you typed with this ready message?")) return;
    setTpl(id);
    if (t && person) { filled.current = fillTemplate(t.body, person, db.settings); setBody(filled.current); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(body); say("Message copied"); }
    catch { document.querySelector<HTMLTextAreaElement>("dialog[open] textarea")?.select(); say("Could not copy. The message is selected, so copy it by hand.", "warn"); }
  }
  const log = () => once(async () => {
    const days = Number(next);
    const due = person!.followUpOn && person!.followUpOn <= today;
    // Reaching out settles a follow-up that was due. Pick a new one or it clears.
    // Both go in one save, so a retry can never log the reach-out twice.
    const followUpOn = days > 0 ? addDays(today, days) : due ? "" : undefined;
    const ok = await save(actions.addTouch(person!.id, kind, body.trim(), followUpOn), days > 0 ? `Logged. Follow-up set for ${first}.` : `Logged for ${first}`);
    if (ok) onClose();
  });

  return (
    <Dialog open onClose={onClose} title={`Reach out to ${first}`}>
      <Pick label="Start from a ready message" value={tpl} onChange={(e) => pickTemplate(e.target.value)}>
        <option value="">Write my own</option>
        {config.templates.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
      </Pick>
      <Area label="Message" data-autofocus rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder={`What do you want to say to ${first}?`} />
      <div className="flex flex-wrap gap-2">
        {person.phone && <a className={btnClass()} href={`sms:${person.phone}?&body=${enc(body)}`} onClick={() => setKind("text")}><MessageSquare size={20} aria-hidden />Text</a>}
        {person.email && <a className={btnClass()} href={`mailto:${person.email}?subject=${enc(subject)}&body=${enc(body)}`} onClick={() => setKind("email")}><Mail size={20} aria-hidden />Email</a>}
        {person.phone && <a className={btnClass()} href={`tel:${person.phone}`} onClick={() => setKind("call")}><Phone size={20} aria-hidden />Call</a>}
        <Button onClick={copy} disabled={!body}><Copy size={20} aria-hidden />Copy</Button>
      </div>
      <p className="text-sm text-soft">Text, Email and Call open the app on your device. Nothing sends until you press send there.</p>
      <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
        <Pick label="How did you reach out?" value={kind} onChange={(e) => setKind(e.target.value as TouchKind)}>
          {(["text", "call", "email", "dm", "meeting"] as const).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
        </Pick>
        <Pick label="Follow up again" value={next} onChange={(e) => setNext(e.target.value)}>
          <option value="0">No date yet</option>
          <option value="3">In 3 days</option>
          <option value="7">In 1 week</option>
          <option value="30">In 1 month</option>
          <option value="90">In 3 months</option>
        </Pick>
        <Button kind="primary" className="sm:col-span-2" onClick={() => void log()} disabled={saving}>{saving ? "Saving" : "I reached out, log it"}</Button>
      </div>
    </Dialog>
  );
}
