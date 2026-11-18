// The 2-minute tour, inside the CRM, so members can watch it again any time (Settings).
import { host } from "../../src/api.ts";
import { Card } from "../../src/ui.tsx";

const TOUR = "https://crm.1buttonbusiness.com/tour";

export function TourCard() {
  return (
    <Card title="Watch the 2-minute tour">
      <div className="grid gap-3">
        <p className="text-soft">How your CRM works, and how to connect your own Claude so it fills things in for you.</p>
        {/* A member's own site does not carry the video file, so it links to 1BB's tour page instead. */}
        {host.ownSite ? (
          <a className="font-semibold underline justify-self-start" href={TOUR} target="_blank" rel="noreferrer">Open the tour (new tab)</a>
        ) : (
          <video controls preload="none" playsInline poster="/tour-poster.jpg" className="w-full rounded-xl border border-line bg-black" style={{ aspectRatio: "16 / 9" }}>
            <source src="/tour.mp4" type="video/mp4" />
            <track kind="captions" src="/tour.vtt" srcLang="en" label="English" default />
          </video>
        )}
      </div>
    </Card>
  );
}
