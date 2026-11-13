// Small building blocks every screen shares. Change a button here, it changes everywhere.
import { useEffect, useId, useRef, useState } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { kind?: "primary" | "secondary" | "quiet" };
const BTN = {
  primary: "bg-accent text-on-accent hover:brightness-110",
  secondary: "bg-raised text-ink border border-line hover:border-soft",
  quiet: "text-ink hover:bg-raised",
};
export const btnClass = (kind: keyof typeof BTN = "secondary") =>
  `inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-base font-semibold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${BTN[kind]}`;

export function Button({ kind = "secondary", className = "", type = "button", ...rest }: BtnProps) {
  return <button type={type} className={`${btnClass(kind)} ${className}`} {...rest} />;
}

const INPUT = "min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink";

/** The red line under a box when a save was refused. Read out loud by screen readers. */
function Problem({ id, error }: { id: string; error?: string }) {
  return error ? <p id={`${id}-err`} role="alert" className="text-sm font-semibold text-warn">{error}</p> : null;
}
const describe = (id: string, hint?: string, error?: string) => [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(" ") || undefined;

export function Field({ label, hint, error, className = "", ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }) {
  const id = useId();
  return (
    <div className={`grid min-w-0 content-start gap-1 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold text-soft">{label}</label>
      <input id={id} className={`${INPUT} ${error ? "border-warn" : ""}`} aria-invalid={error ? true : undefined} aria-describedby={describe(id, hint, error)} {...rest} />
      {hint && <p id={`${id}-hint`} className="text-sm text-soft">{hint}</p>}
      <Problem id={id} error={error} />
    </div>
  );
}

export function Area({ label, error, className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }) {
  const id = useId();
  return (
    <div className={`grid min-w-0 gap-1 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold text-soft">{label}</label>
      <textarea id={id} rows={3} className={`${INPUT} py-3 ${error ? "border-warn" : ""}`} aria-invalid={error ? true : undefined} aria-describedby={describe(id, undefined, error)} {...rest} />
      <Problem id={id} error={error} />
    </div>
  );
}

/**
 * A box that saves when you click away. If the save is refused, what you
 * typed stays put and the reason shows right under the box.
 */
export function useSaved(stored: string, commit: (value: string) => Promise<unknown>, onSaved?: () => void) {
  const [value, setValue] = useState(stored);
  const [error, setError] = useState("");
  useEffect(() => { setValue(stored); setError(""); }, [stored]);
  return {
    value, error,
    onChange: (e: { target: { value: string } }) => { setValue(e.target.value); setError(""); },
    onBlur: () => {
      if (value === stored) return;
      commit(value).then(() => { setError(""); onSaved?.(); }, (e: unknown) => setError(e instanceof Error ? e.message : "That did not save. Try again."));
    },
  };
}

export function Pick({ label, className = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const id = useId();
  return (
    <div className={`grid min-w-0 gap-1 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold text-soft">{label}</label>
      <select id={id} className={`${INPUT} select h-12`} {...rest}>{children}</select>
    </div>
  );
}

export function Card({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-6 ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-4">
          {title && <h2 className="text-xl">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="grid justify-items-start gap-2 rounded-xl border border-dashed border-line p-6">
      <p className="font-semibold">{title}</p>
      {children && <div className="grid justify-items-start gap-4 text-soft">{children}</div>}
    </div>
  );
}

export function Avatar({ name }: { name: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  return <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-raised text-sm font-semibold text-soft">{initials || "?"}</span>;
}

export function Chip({ children, tone = "plain" }: { children: ReactNode; tone?: "plain" | "warn" | "good" }) {
  const tones = { plain: "text-soft border-line", warn: "text-warn border-warn", good: "text-good border-good" };
  return <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-semibold whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

/** A pop-up that closes on Escape or a click outside, and hands focus back. */
export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { d.showModal(); d.querySelector<HTMLElement>("[data-autofocus]")?.focus(); }
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      aria-label={title}
      className="pop m-auto max-h-[90dvh] w-[min(34rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-line bg-surface p-0"
    >
      {open && (
        <div className="grid gap-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-2xl">{title}</h2>
            <Button kind="quiet" onClick={onClose} aria-label="Close" className="-m-2 px-3">✕</Button>
          </div>
          {children}
        </div>
      )}
    </dialog>
  );
}

/** The little message at the bottom. It sits above pop-ups so errors are never hidden behind one. */
export function Toast({ message, tone }: { message: string; tone: "good" | "warn" }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el?.showPopover) return;
    // Re-opening moves it to the very top layer, above any open dialog.
    try { if (el.matches(":popover-open")) el.hidePopover(); if (message) el.showPopover(); } catch { /* older browsers show it in place */ }
  }, [message]);
  return (
    <div ref={ref} popover="manual" role={tone === "warn" ? "alert" : "status"} aria-live={tone === "warn" ? "assertive" : "polite"}
      className="toast pointer-events-none fixed inset-x-0 top-4 bottom-auto m-0 w-full justify-center border-0 bg-transparent p-0 px-4 lg:top-auto lg:bottom-8">
      {message && <p className={`pop max-w-none rounded-xl border bg-surface px-4 py-3 font-semibold shadow-lg ${tone === "good" ? "border-good text-good" : "border-warn text-warn"}`}>{message}</p>}
    </div>
  );
}

/** Stops a fast double-click from running the same save twice. */
export function useOnce() {
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const once = async (work: () => Promise<unknown>) => {
    if (running.current) return;
    running.current = true; setBusy(true);
    try { await work(); } finally { running.current = false; setBusy(false); }
  };
  return [busy, once] as const;
}

export const go = (path: string) => { window.location.hash = path; };
export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
export function ago(days: number): string {
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 60) return `${days} days ago`;
  return `${Math.round(days / 30)} months ago`;
}
export function inDaysText(n: number): string {
  return n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`;
}
