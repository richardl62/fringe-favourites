// Resolve each show's start time for the selected date.
import { unknownDate, type Show, type TimesT } from "./data/types";

export interface ProcessedStartTime {
  startTime: string | null;
  startTimeVaries: boolean;
}

/** A booked show only has one relevant date - its booked one - so its start
 * time should always resolve to that, regardless of which date is currently
 * selected in the UI. */
function effectiveDate(show: Show, date: number | null): number | null {
  if (show.booked && show.dates !== unknownDate) {
    return show.dates[0];
  }
  return date;
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
    processStartTime(show.times, effectiveDate(show, date)).map((startTime) => ({
      ...show,
      ...startTime,
    })),
  );
}
