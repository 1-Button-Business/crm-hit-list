// The front door: sign in, pick a CRM type, pick where it lives, then the CRM itself.
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { Suspense, lazy, useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { api } from "../convex/_generated/api";
import { presets, setFlavor } from "../../crm.config.ts";
import { host } from "../../src/api.ts";
import { Button, Card, Field, btnClass } from "../../src/ui.tsx";
import { Account } from "./Account.tsx";
import { Admin } from "./Admin.tsx";
import { ConnectClaude, Dashboard } from "./Claude.tsx";
import { makeBackend } from "./backend.ts";
import { TourCard } from "./TourCard.tsx";
import { convex } from "./main.tsx";

type Flavor = keyof typeof presets;
const FLAVORS = Object.keys(presets) as Flavor[];
const REPO: Record<Flavor, string> = { roster: "crm-client-roster", hitlist: "crm-hit-list", giftbook: "crm-gift-book" };
const demo = (f: Flavor) => `https://1-button-business.github.io/${REPO[f]}/`;
const repo = (f: Flavor) => `https://github.com/1-Button-Business/${REPO[f]}`;
const BEST: Record<Flavor, string> = {
  roster: "You work with clients over weeks or months and want nobody to slip.",
  hitlist: "Your business runs on relationships and referrals over a long time.",
  giftbook: "You sell to customers who come back, and you like to send a thank-you.",
};

// The CRM screens load only after the type is set, so every screen reads the right words.
const Crm = lazy(() => import("../../src/App.tsx").then((m) => ({ default: m.App })));

/** The frame around every front-door screen. A step screen names itself and takes keyboard focus on arrival. */
function Shell({ children, action, title }: { children: ReactNode; action?: ReactNode; title?: string }) {
  useEffect(() => {
    document.title = title ? `${title} · 1BB CRM` : "1BB CRM";
    document.documentElement.dataset.brand = "onebb";
    if (title) document.getElementById("step-title")?.focus({ preventScroll: true });
  }, [title]);
  return (
    <div className="mx-auto grid min-h-dvh max-w-5xl content-start gap-8 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3 py-2">
        <p className="flex items-center gap-3 text-xl font-semibold"><img src="/favicon.svg" alt="" width={32} height={32} className="rounded-lg" /><span>1 Button Business <span className="text-accent">CRM</span></span></p>
        {action}
      </header>
      <main className="grid content-start gap-6">{children}</main>
      <footer className="rule mt-8 flex flex-wrap items-center gap-x-1 py-4 text-sm text-soft">
        <span>Built by Drey Thomas. Drey's gift to you, from</span> <a className="inline-flex min-h-12 items-center underline" href="https://1buttonbusiness.com" target="_blank" rel="noreferrer" aria-label="1 Button Business (opens in a new tab)">1 Button Business</a>
      </footer>
    </div>
  );
}

function TypeCard({ f, children, sub }: { f: Flavor; children?: ReactNode; sub?: boolean }) {
  const Title = sub ? "h4" : "h2";
  const p = presets[f];
  return (
    <li className="panel flex flex-col gap-3 p-6">
      <Title className="text-xl font-semibold">{p.title}</Title>
      <p className="text-soft">{BEST[f]}</p>
      <p className="text-sm text-soft"><span className="font-semibold text-ink">Stages:</span> {p.stages.map((s) => s.label).join(", ")}</p>
      <div className="mt-auto pt-1">{children}</div>
    </li>
  );
}

function Welcome() {
  const { signIn } = useAuthActions();
  const [going, setGoing] = useState("");
  const busy = going !== "";
  const go = (provider: string) => { setGoing(provider); void signIn(provider).catch(() => setGoing("")); };
  // Shown once, right after someone erases their account.
  const [erased] = useState(() => { const e = sessionStorage.getItem("erased") === "1"; sessionStorage.removeItem("erased"); return e; });
  return (
    <Shell>
      {erased && <p role="status" className="rounded-2xl border border-good bg-surface p-4 font-semibold text-good">Your account is erased. Nothing you saved is left on this site.</p>}
      <div className="grid gap-12 md:gap-16">
        <section className="rise grid items-center gap-8 pt-4 md:grid-cols-2 md:pt-12">
          <div className="grid content-start gap-6">
            <p className="eyebrow">Free for 1BB members</p>
            <h1 className="hero-title">Pick your CRM. Make it yours.</h1>
            <p className="text-xl text-soft">One simple place for your people, your follow-ups and every conversation.</p>
            <div className="flex flex-wrap items-start gap-3">
              <div className="grid justify-items-start gap-2">
                <Button kind="primary" disabled={busy} aria-busy={going === "google"} onClick={() => go("google")}>{going === "google" ? "Opening Google" : "Sign in with Google"}</Button>
                <p className="text-soft">Use the email you joined 1BB with.</p>
              </div>
              <a className={btnClass()} href="/tour">Watch the 2-minute tour</a>
              {import.meta.env.DEV && <Button kind="quiet" disabled={busy} onClick={() => go("anonymous")}>{going === "anonymous" ? "Signing in" : "Test sign-in"}</Button>}
            </div>
          </div>
          <picture>
            <source media="(max-width: 767px)" srcSet="/today-phone.jpg" width={780} height={1100} />
            <img src="/today.jpg" alt="The Today screen: who to talk to today, with a daily goal ring" width={1400} height={875} className="shot mx-auto w-full max-w-80 md:max-w-none" />
          </picture>
        </section>

        <section className="rise rise-2 grid gap-8" aria-labelledby="how">
          <h2 id="how" className="text-3xl">Three steps and you are in</h2>
          <ol role="list" className="grid gap-12">
            <li className="grid gap-4 md:grid-cols-[4rem_1fr]">
              <span aria-hidden="true" className="step-num">1</span>
              <div className="grid gap-4">
                <h3 className="text-2xl">Pick the one that sounds like you</h3>
                <ul role="list" className="grid gap-4 md:grid-cols-3">
                  {FLAVORS.map((f) => (
                    <TypeCard key={f} f={f} sub>
                      <a className={btnClass()} href={demo(f)} target="_blank" rel="noreferrer" aria-label={`Try the demo: ${presets[f].title} (opens in a new tab)`}>Try the demo</a>
                    </TypeCard>
                  ))}
                </ul>
              </div>
            </li>
            <li className="rule grid gap-4 pt-12 md:grid-cols-[4rem_1fr]">
              <span aria-hidden="true" className="step-num">2</span>
              <div className="grid gap-4">
                <h3 className="text-2xl">Choose where it lives</h3>
                <p className="text-soft">You choose after you sign in, and you can do both.</p>
                <dl className="grid gap-6 md:grid-cols-2">
                  <div className="grid content-start gap-2">
                    <dt className="text-xl font-semibold">Use it here</dt>
                    <dd className="text-soft">Sign in and start. Nothing to install. Works on your phone and your computer.</dd>
                  </div>
                  <div className="grid content-start gap-2">
                    <dt className="text-xl font-semibold">Run your own copy</dt>
                    <dd className="text-soft">It lives on your computer. Claude can rebuild any part of it, and pull in your calendar, call recorder, texts and email. About 5 minutes to set up.</dd>
                  </div>
                </dl>
              </div>
            </li>
            <li className="rule grid gap-4 pt-12 md:grid-cols-[4rem_1fr]">
              <span aria-hidden="true" className="step-num">3</span>
              <div className="grid gap-4">
                <h3 className="text-2xl">Bring in your people and your conversations</h3>
                <p className="text-soft">Drop in a spreadsheet of contacts, a calendar file, or paste a text thread. Each one lands under the right person.</p>
                <div className="grid justify-items-start gap-2">
                  <Button kind="primary" disabled={busy} aria-busy={going === "google"} onClick={() => go("google")}>{going === "google" ? "Opening Google" : "Sign in with Google"}</Button>
                  <p className="text-soft">Use the email you joined 1BB with.</p>
                </div>
              </div>
            </li>
          </ol>
        </section>
      </div>
    </Shell>
  );
}

/** A member's own site: one owner, email and password. The first visit makes the login with the setup code. */
function OwnerSignIn() {
  const { signIn } = useAuthActions();
  const [first, setFirst] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  useEffect(() => { document.title = "Sign in · My CRM"; }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = new FormData(e.currentTarget);
    form.set("flow", first ? "signUp" : "signIn");
    setBusy(true); setProblem("");
    try { await signIn("password", form); }
    catch (err) {
      setProblem(err instanceof ConvexError && typeof err.data === "string" ? err.data
        : first ? "That did not work. Check the email and the setup code, and use a password of at least 8 characters."
        : "That email and password do not match. Too many tries locks sign-in for a while.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto grid min-h-dvh max-w-md content-center gap-6 p-4 sm:p-6">
      <Card title={first ? "Make your login" : "Sign in to your CRM"}>
        <form className="grid gap-4" onSubmit={(e) => void submit(e)}>
          <Field label="Your email" name="email" type="email" autoComplete="username" required />
          <Field label={first ? "Pick a password" : "Password"} name="password" type="password" autoComplete={first ? "new-password" : "current-password"} minLength={8} required hint={first ? "At least 8 characters. Use one you do not use anywhere else." : undefined} />
          {first && <Field label="Setup code" name="setupCode" autoComplete="off" required hint="Claude gave you this code when it put your CRM online." />}
          {problem && <p role="alert" className="font-semibold text-warn">{problem}</p>}
          <Button kind="primary" type="submit" disabled={busy}>{busy ? "One moment" : first ? "Make my login" : "Sign in"}</Button>
        </form>
      </Card>
      <Button kind="quiet" onClick={() => { setFirst(!first); setProblem(""); }} className="justify-self-start">{first ? "I already have a login" : "First time here? Make your login"}</Button>
    </main>
  );
}

function SignOut() {
  const { signOut } = useAuthActions();
  return <Button onClick={() => void signOut()}>Sign out</Button>;
}

function NotMember({ email }: { email: string }) {
  return (
    <Shell action={<SignOut />} title="Members only">
      <Card title="This one is for 1BB members">
        <div className="grid gap-4">
          <p className="text-soft">You signed in as <span className="font-semibold text-ink">{email || "an account with no email"}</span>, and that email is not on the member list. If you are a member, sign out and use the email you joined 1BB with, or ask Drey to add this one.</p>
          <p className="text-soft">Everyone can still try the demos and run their own copy for free.</p>
          <div className="flex flex-wrap gap-2">
            {FLAVORS.map((f) => <a key={f} className={btnClass()} href={demo(f)} target="_blank" rel="noreferrer" aria-label={`${presets[f].title} demo (opens in a new tab)`}>{presets[f].title} demo</a>)}
          </div>
        </div>
      </Card>
    </Shell>
  );
}

function Choose({ ownSite }: { ownSite: boolean }) {
  const save = useMutation(api.crm.setFlavor);
  const [pick, setPick] = useState<Flavor | null>(null);
  const [own, setOwn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");

  // Each step is its own stop in the browser history, so the Back button goes to step 1.
  useEffect(() => {
    const back = (e: PopStateEvent) => setPick(((e.state as { pick?: Flavor } | null)?.pick) ?? null);
    window.addEventListener("popstate", back);
    return () => window.removeEventListener("popstate", back);
  }, []);
  // On a member's own site there is nowhere else to live, so picking a type starts the CRM.
  const choose = (f: Flavor) => { if (ownSite) return void start(f); window.history.pushState({ pick: f }, ""); setPick(f); };

  async function start(f: Flavor) {
    if (busy) return;
    setBusy(true); setProblem("");
    try { await save({ flavor: f }); }
    catch { setProblem("That did not go through. Check your internet and try again."); setBusy(false); }
  }

  if (!pick) {
    return (
      <Shell action={<SignOut />} title={ownSite ? "Pick your CRM" : "Step 1 of 2"}>
        <h1 id="step-title" tabIndex={-1} className="text-3xl outline-none">{ownSite ? "Which one sounds like you?" : "Step 1 of 2: which one sounds like you?"}</h1>
        <p className="text-soft">You can switch later in Settings. Your people come with you.</p>
        {problem && <p role="alert" className="font-semibold text-warn">{problem}</p>}
        <ul role="list" className="grid gap-4 md:grid-cols-3">
          {FLAVORS.map((f) => (
            <TypeCard key={f} f={f}>
              <div className="flex flex-wrap gap-2">
                <Button disabled={busy} onClick={() => choose(f)} aria-label={`Choose this one: ${presets[f].title}`}>Choose this one</Button>
                <a className={btnClass("quiet")} href={demo(f)} target="_blank" rel="noreferrer" aria-label={`Try the demo: ${presets[f].title} (opens in a new tab)`}>Try the demo</a>
              </div>
            </TypeCard>
          ))}
        </ul>
      </Shell>
    );
  }

  return (
    <Shell action={<SignOut />} title="Step 2 of 2">
      <h1 id="step-title" tabIndex={-1} className="text-3xl outline-none">Step 2 of 2: where should your {presets[pick].title} live?</h1>
      {problem && <p role="alert" className="font-semibold text-warn">{problem}</p>}
      <ul className="grid gap-4 md:grid-cols-2">
        <li className="panel grid content-start gap-3 p-6">
          <h2 className="text-xl">Use it here</h2>
          <p className="text-soft">Start right now. Nothing to install. Works on your phone and your computer. You can download your list or delete it any time.</p>
          <Button kind="primary" disabled={busy} onClick={() => void start(pick)} className="justify-self-start">{busy ? "Setting it up" : "Start using it here"}</Button>
        </li>
        <li className="panel grid content-start gap-3 p-6">
          <h2 className="text-xl">Run my own copy</h2>
          <p className="text-soft">It lives on your computer. Claude can rebuild any part of it, and pull in your calendar, call recorder, texts and email.</p>
          <Button onClick={() => setOwn(!own)} aria-expanded={own} aria-controls="own-steps" className="justify-self-start">{own ? "Hide the steps" : "Show me the steps"}</Button>
          {own && (
            <ol id="own-steps" className="grid list-decimal gap-2 pl-6 text-soft">
              <li>Open <a className="font-semibold underline" href={repo(pick)} target="_blank" rel="noreferrer">the {presets[pick].title} page</a> and press "Use this template".</li>
              <li>Open Claude, choose that folder, and say: "Set up my CRM."</li>
              <li>Claude does the rest and opens your CRM. About 5 minutes.</li>
            </ol>
          )}
        </li>
      </ul>
      <Button kind="quiet" onClick={() => window.history.back()} className="justify-self-start">Back to the three types</Button>
    </Shell>
  );
}

function Hosted({ flavor, ownSite }: { flavor: Flavor; ownSite: boolean }) {
  // Runs once, before the CRM screens load.
  useState(() => {
    setFlavor(presets[flavor]);
    host.ownSite = ownSite;
    delete document.documentElement.dataset.brand; // the CRM wears the member's own theme
    host.hosted = true;
    host.backend = makeBackend(convex);
    host.settingsExtra = () => <><TourCard /><ConnectClaude /><Account /></>;
    host.todayExtra = () => <Dashboard />;
  });
  return <Suspense fallback={<Wait />}><Crm /></Suspense>;
}

const Wait = () => <main className="grid min-h-dvh place-items-center p-6"><p role="status" className="text-soft">Opening your CRM</p></main>;

export function Hub() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const site = useQuery(api.crm.site);
  const me = useQuery(api.crm.me, isAuthenticated ? {} : "skip");
  if (isLoading || !site) return <Wait />;
  const own = site.ownSite;
  if (!isAuthenticated) return own ? <OwnerSignIn /> : <Welcome />;
  if (!me || !me.signedIn) return <Wait />;
  if (!me.member) return <NotMember email={me.email} />;
  if (!own && location.pathname === "/admin") return <Admin />;
  if (!(me.flavor in presets)) return <Choose ownSite={own} />;
  return <Hosted flavor={me.flavor as Flavor} ownSite={own} />;
}
