// Resolve each show's start time for the selected date.
import type { Show, TimesT } from "./data/types";

export interface ProcessedStartTime {
  startTime: string | null;
  startTimeVaries: boolean;
}

/** A date with two performances yields one ProcessedStartTime per
 * performance, so the show gets a separate entry for each on the page. */
function processStartTime(
  times: TimesT,
  date: number | null,
): ProcessedStartTime[] {
  if (typeof times === "string") {
    return [{ startTime: times, startTimeVaries: false }];
  }

  const performanceTime = date !== null ? times[date] : undefined;
  if (performanceTime === undefined || performanceTime.kind === "many") {
    return [{ startTime: null, startTimeVaries: true }];
  }
  if (performanceTime.kind === "double") {
    return performanceTime.times.map((startTime) => ({
      startTime,
      startTimeVaries: true,
    }));
  }
  return [{ startTime: performanceTime.time, startTimeVaries: true }];
}

export type ShowInfo = Show & ProcessedStartTime;

/** Return a version of the loaded shows with start time resolved for the
 * given date - a show with two performances that day becomes two entries,
 * one per performance. No sorting or filtering is done at this stage. */
export function getFavourites(shows: Show[], date: number | null): ShowInfo[] {
  return shows.flatMap((show) =>
    processStartTime(show.times, date).map((startTime) => ({
      ...show,
      ...startTime,
    })),
  );
}
