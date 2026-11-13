// ─────────────────────────────────────────────────────────────
//  YOUR CRM SETTINGS
//  This is the one file that decides how your CRM talks and what it tracks.
//  Change it yourself, or tell Claude: "Change my stages to ..." and it edits this.
// ─────────────────────────────────────────────────────────────
import type { Preset } from "./presets/types.ts";
import { roster } from "./presets/roster.ts";
import { hitlist } from "./presets/hitlist.ts";
import { giftbook } from "./presets/giftbook.ts";

export const presets = { roster, hitlist, giftbook };

// Pick your starting point: roster, hitlist or giftbook.
const base: Preset = hitlist;

// Then make it yours. Anything you put here wins over the starting point.
export const config: Preset = {
  ...base,
  // peopleWord: "Patients",
  // stages: [...base.stages, { id: "vip", label: "VIP" }],
};

export const restStages = config.stages.filter((s) => s.rest).map((s) => s.id);
