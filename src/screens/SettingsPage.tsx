import { config } from "../../crm.config.ts";
import type { Settings } from "../../shared/types.ts";
import { DEMO } from "../api.ts";
import { useCrm } from "../crm.ts";
import { demoExportUrl } from "../demoStore.ts";
import { Card, Field, btnClass, useSaved } from "../ui.tsx";

const THEMES: { id: string; label: string; bg: string; dot: string }[] = [
  { id: "", label: "Match my device", bg: "linear-gradient(90deg,#ffffff 50%,#131c2e 50%)", dot: "#1d4ed8" },
  { id: "daylight", label: "Daylight", bg: "#ffffff", dot: "#1d4ed8" },
  { id: "harbor", label: "Harbor", bg: "#edf3f4", dot: "#0f6b64" },
  { id: "rose", label: "Rose", bg: "#f7f3f4", dot: "#b0123a" },
  { id: "midnight", label: "Midnight", bg: "#131c2e", dot: "#5eead4" },
  { id: "forest", label: "Forest", bg: "#14201b", dot: "#86efac" },
  { id: "ember", label: "Ember", bg: "#201917", dot: "#fb923c" },
];

function Setting({ k, label, hint, type = "text" }: { k: keyof Settings; label: string; hint?: string; type?: "text" | "number" }) {
  const { db, actions, say } = useCrm();
  const box = useSaved(String(db.settings[k]), (v) => {
    // An empty box is not zero. Refuse it instead of quietly saving 0.
    if (type === "number" && !/^[1-9]\d*$/.test(v.trim())) return Promise.reject(new Error("Type a whole number, 1 or more"));
    return actions.updateSettings({ [k]: type === "number" ? Number(v) : v });
  }, () => say("Saved"));
  return <Field label={label} hint={hint} type="text" inputMode={type === "number" ? "numeric" : undefined} {...box} />;
}

export function SettingsPage() {
  const { db, actions, save } = useCrm();
  return (
    <>
      <Card title="Your business" className="rise">
        <div className="grid gap-4 sm:grid-cols-2">
          <Setting k="businessName" label="Business name" />
          <Setting k="yourName" label="Your first name" hint="Used to sign your messages." />
          <Setting k="dailyGoal" type="number" label="Reach-outs per day" hint="Your daily goal on the Today screen." />
          <Setting k="quietDays" type="number" label="Quiet after this many days" hint={`When a ${config.personWord} shows under "Haven't talked in a while".`} />
        </div>
      </Card>

      <Card title="Look" className="rise rise-2">
        <div role="group" aria-label="Theme" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {THEMES.map((t) => {
            const on = db.settings.theme === t.id;
            return (
              <button key={t.id} aria-pressed={on} onClick={() => void save(actions.updateSettings({ theme: t.id }), `${t.label} it is`)}
                className={`grid min-h-12 gap-2 rounded-xl border-2 p-3 text-left font-semibold ${on ? "border-accent" : "border-line hover:border-soft"}`}>
                <span aria-hidden className="flex h-12 items-end justify-end rounded-lg border border-line p-2" style={{ background: t.bg }}>
                  <span className="size-4 rounded-full" style={{ background: t.id === "" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "#5eead4" : t.dot }} />
                </span>
                {t.label}{t.id === "" && <span className="text-sm font-normal text-soft">{window.matchMedia("(prefers-color-scheme: dark)").matches ? "Midnight right now" : "Daylight right now"}</span>}
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-soft">Want your own brand colors? Open "Add features" and use "Make it match my brand".</p>
      </Card>

      <Card title="Your data" className="rise rise-3">
        <div className="grid gap-4">
          <p className="text-soft">Everything is saved in one file on this computer: the <code>data</code> folder inside your CRM folder. A backup copy is made every day you use it, and the last 30 are kept.</p>
          <a className={`${btnClass()} justify-self-start`} href={DEMO ? demoExportUrl() : "/api/export"} download="my-crm.csv">Download my {config.peopleWord.toLowerCase()} as a spreadsheet</a>
        </div>
      </Card>

      <Card title="About this CRM">
        <div className="grid gap-2 text-soft">
          <p>This is the <span className="font-semibold text-ink">{config.title}</span> starter, made for {config.madeFor.toLowerCase()}.</p>
          <p>Built by Drey Thomas for the members of 1 Button Business. It is Drey's gift to you. It is yours to keep, change and grow.</p>
          <p>Stuck? Open Claude in this folder and say what is wrong in plain words.</p>
        </div>
      </Card>
    </>
  );
}
