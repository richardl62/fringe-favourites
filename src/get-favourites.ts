// Resolve each show's start time for the selected date.
import type { Show, TimesT } from "./data/types";

export interface ProcessedStartTime {
  startTime: string | null;
  startTimeVaries: boolean;
}

function processStartTime(
  times: TimesT,
  date: number | null,
): ProcessedStartTime {
  if (typeof times === "string") {
    return { startTime: times, startTimeVaries: false };
  }

  const startTime = date !== null ? (times[date] ?? null) : null;
  return { startTime, startTimeVaries: true };
}

export type ShowInfo = Show & ProcessedStartTime;

/** Return a version of the loaded shows with start time resolved for the
 * given date. No sorting or filtering is done at this stage. */
export function getFavourites(shows: Show[], date: number | null): ShowInfo[] {
  return shows.map((show) => ({
    ...show,
    ...processStartTime(show.times, date),
  }));
}
