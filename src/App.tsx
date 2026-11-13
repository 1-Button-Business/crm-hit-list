import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Cable, CalendarHeart, Columns3, Handshake, Home, Menu, Plus, Settings as Cog, Sparkles, Upload, Users } from "lucide-react";
import { config } from "../crm.config.ts";
import { dayOf } from "../shared/logic.ts";
import type { Person } from "../shared/types.ts";
import { DEMO, useDb } from "./api.ts";
import { DemoBanner, Tour } from "./Tour.tsx";
import { CrmContext } from "./crm.ts";
import type { Crm } from "./crm.ts";
import { AddPersonDialog, ReachOutDialog } from "./dialogs.tsx";
import { Button, Empty, Toast, go } from "./ui.tsx";
import { Today } from "./screens/Today.tsx";
import { People } from "./screens/People.tsx";
import { PersonPage } from "./screens/PersonPage.tsx";
import { Pipeline } from "./screens/Pipeline.tsx";
import { Dates } from "./screens/Dates.tsx";
import { Referrals } from "./screens/Referrals.tsx";
import { ImportPage } from "./screens/ImportPage.tsx";
import { Grow } from "./screens/Grow.tsx";
import { Connections } from "./screens/Connections.tsx";
import { SettingsPage } from "./screens/SettingsPage.tsx";

type Dest = { path: string; label: string; icon: typeof Home; main?: boolean };
const DESTS: Dest[] = [
  { path: "today", label: "Today", icon: Home, main: true },
  { path: "people", label: config.peopleWord, icon: Users, main: true },
  { path: "pipeline", label: "Pipeline", icon: Columns3, main: true },
  { path: "dates", label: "Dates", icon: CalendarHeart, main: true },
  { path: "referrals", label: "Referrals", icon: Handshake },
  { path: "connections", label: "Connections", icon: Cable },
  { path: "import", label: "Import", icon: Upload },
  { path: "grow", label: "Add features", icon: Sparkles },
  { path: "settings", label: "Settings", icon: Cog },
];

function useRoute(): [string, string] {
  const read = () => window.location.hash.replace(/^#\/?/, "") || "today";
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => {
      setRoute(read());
      window.scrollTo(0, 0);
      // Tell keyboard and screen-reader users the page changed.
      setTimeout(() => document.getElementById("page-title")?.focus({ preventScroll: true }), 60);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  const [page = "today", arg = ""] = route.split("/");
  return [page, decodeURIComponent(arg)];
}

function NavLink({ d, active, compact }: { d: Dest; active: boolean; compact?: boolean }) {
  const Icon = d.icon;
  return (
    <a
      href={`#/${d.path}`}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-12 items-center gap-1 rounded-xl text-xs font-semibold transition ${compact ? "flex-1 flex-col justify-center py-2" : "flex-col justify-center px-1 py-3"} ${active ? "bg-raised text-accent" : "text-soft hover:bg-raised hover:text-ink"}`}
    >
      <Icon size={24} aria-hidden />
      <span className="text-center">{d.label}</span>
    </a>
  );
}

function More() {
  return (
    <div className="grid gap-2">
      {DESTS.filter((d) => !d.main).map((d) => (
        <a key={d.path} href={`#/${d.path}`} className="flex min-h-12 items-center gap-4 rounded-2xl border border-line bg-surface p-4 font-semibold hover:border-soft">
          <d.icon size={24} aria-hidden className="text-accent" />{d.label}
        </a>
      ))}
    </div>
  );
}

export function App() {
  const { db, error, refresh, actions } = useDb();
  const [page, arg] = useRoute();
  const [adding, setAdding] = useState(false);
  const [reaching, setReaching] = useState<{ person: Person; templateId?: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: "good" | "warn" }>({ message: "", tone: "good" });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const say = useCallback((message: string, tone: "good" | "warn" = "good") => {
    clearTimeout(timer.current);
    setToast({ message, tone });
    timer.current = setTimeout(() => setToast((t) => ({ ...t, message: "" })), tone === "warn" ? 6000 : 2500);
  }, []);
  const save = useCallback(async (work: Promise<unknown>, done?: string) => {
    try { await work; if (done) say(done); return true; }
    catch (e) { say(e instanceof Error ? e.message : "That did not save. Try again.", "warn"); return false; }
  }, [say]);

  const theme = db?.settings.theme;
  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme;
    else delete document.documentElement.dataset.theme;
  }, [theme]);

  const today = dayOf(new Date());
  const crm = useMemo<Crm | null>(() => db && {
    db, actions, today, say, save,
    reach: (person, templateId) => setReaching({ person, templateId }),
    addPerson: () => setAdding(true),
    // actions is rebuilt each render but always does the same thing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, today, say, save]);

  if (!db || !crm) {
    return (
      <main className="grid min-h-dvh place-items-center p-6">
        {error
          ? <Empty title="Your CRM is not answering"><p>{error}</p><Button kind="primary" onClick={() => void refresh()}>Try again</Button></Empty>
          : <p role="status" className="text-soft">Opening your CRM</p>}
      </main>
    );
  }

  const active = page === "person" ? "people" : page;
  const dest = DESTS.find((d) => d.path === active);
  const heading = page === "person" ? db.people.find((p) => p.id === arg)?.name ?? config.peopleWord : page === "more" ? "More" : dest?.label ?? "Not found";
  document.title = `${heading} · ${db.settings.businessName || "My CRM"}`;
  const screens: Record<string, ReactNode> = {
    today: <Today />, people: <People query={arg} />, person: <PersonPage id={arg} />, pipeline: <Pipeline />,
    dates: <Dates />, referrals: <Referrals />, import: <ImportPage />, connections: <Connections />, grow: <Grow />, settings: <SettingsPage />, more: <More />,
  };

  return (
    <CrmContext.Provider value={crm}>
      <a href="#main" onClick={(e) => { e.preventDefault(); document.getElementById("main")?.focus(); }} className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-xl focus:bg-surface focus:p-3">Skip to content</a>
      <div className="mx-auto grid min-h-dvh max-w-[90rem] gap-4 p-3 pb-24 sm:p-4 lg:grid-cols-[6rem_minmax(0,1fr)] lg:pb-4">
        <nav aria-label="Main" className="sticky top-4 hidden h-[calc(100dvh-2rem)] flex-col gap-1 overflow-y-auto rounded-2xl border border-line bg-surface p-2 lg:flex">
          {DESTS.map((d) => <NavLink key={d.path} d={d} active={active === d.path} />)}
        </nav>

        <div className="grid min-w-0 content-start gap-4">
          {DEMO && <DemoBanner />}
          <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-soft">{db.settings.businessName || "My CRM"}</p>
              <h1 id="page-title" tabIndex={-1} className="truncate text-2xl outline-none">{heading}</h1>
            </div>
            {/* On a person's page the main action is reaching out, so this one steps back. */}
            <Button kind={page === "person" ? "secondary" : "primary"} onClick={() => setAdding(true)}><Plus size={20} aria-hidden />Add {config.personWord}</Button>
          </header>

          {error && <p role="alert" className="rounded-2xl border border-warn bg-surface p-4 font-semibold text-warn">{error} You are looking at the last version that loaded.</p>}
          <main id="main" tabIndex={-1} className="grid min-w-0 content-start gap-4 outline-none">
            {screens[page] ?? <Empty title="That page does not exist"><Button onClick={() => go("/today")}>Back to Today</Button></Empty>}
          </main>

          {/* Room at the bottom so the tour card never covers the last row. */}
          {DEMO && <div aria-hidden className="h-96" />}
          <footer className="px-2 py-4 text-sm text-soft">
            Built by Drey Thomas. Drey's gift to you, from <a className="underline" href="https://1buttonbusiness.com" target="_blank" rel="noreferrer">1 Button Business</a>.
          </footer>
        </div>
      </div>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 flex gap-1 border-t border-line bg-surface p-2 safe-bottom lg:hidden">
        {DESTS.filter((d) => d.main).map((d) => <NavLink key={d.path} d={d} active={active === d.path} compact />)}
        <NavLink d={{ path: "more", label: "More", icon: Menu }} active={page === "more" || !!dest && !dest.main} compact />
      </nav>

      {DEMO && <Tour />}
      <AddPersonDialog open={adding} onClose={() => setAdding(false)} />
      <ReachOutDialog person={reaching?.person ?? null} templateId={reaching?.templateId} onClose={() => setReaching(null)} />
      <Toast {...toast} />
    </CrmContext.Provider>
  );
}
