import { router } from "../trpc.js";
import { hoursRouter } from "./hours.js";
import { scheduleRouter } from "./schedule.js";
import { staffRouter } from "./staff.js";
import { timeLogRouter } from "./timeLog.js";

export const appRouter = router({
  staff: staffRouter,
  hours: hoursRouter,
  schedule: scheduleRouter,
  timeLog: timeLogRouter,
});

export type AppRouter = typeof appRouter;