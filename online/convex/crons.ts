import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
// 10 am Eastern, after 1BB's morning promote to production (GitHub runs it around 8:30 am): pull the current 1BB members so new members get in and cancelled ones drop off.
crons.daily("sync members from 1BB", { hourUTC: 15, minuteUTC: 0 }, internal.sync.run);
export default crons;
