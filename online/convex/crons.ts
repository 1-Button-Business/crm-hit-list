import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
// 5 am Eastern: pull the current 1BB members so new members get in and cancelled ones drop off.
crons.daily("sync members from 1BB", { hourUTC: 10, minuteUTC: 0 }, internal.sync.run);
export default crons;
