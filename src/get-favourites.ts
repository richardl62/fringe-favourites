// Resolve each show's start time for the selected date.
import { unknownDate, type Show } from "./data/types";

export interface ProcessedStartTime {
  startTime: string | null;
  startTimeVaries: boolean;
  // True when the resolved date has no allocation remaining - see
  // data/types.ts's Show.noAvailability.
  startTimeUnavailable: boolean;
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
function processStartTime(show: Show, date: number | null): ProcessedStartTime[] {
  const { times } = show;
  const resolvedDate = effectiveDate(show, date);
  const startTimeUnavailable =
    resolvedDate !== null && show.noAvailability.includes(resolvedDate);

  if (typeof times === "string") {
    return [{ startTime: times, startTimeVaries: false, startTimeUnavailable }];
  }

  const performanceTime = resolvedDate !== null ? times[resolvedDate] : undefined;
  if (performanceTime === undefined || performanceTime.kind === "many") {
    return [{ startTime: null, startTimeVaries: true, startTimeUnavailable }];
  }
  if (performanceTime.kind === "double") {
    return performanceTime.times.map((startTime) => ({
      startTime,
      startTimeVaries: true,
      startTimeUnavailable,
    }));
  }
  return [
    { startTime: performanceTime.time, startTimeVaries: true, startTimeUnavailable },
  ];
}

export type ShowInfo = Show & ProcessedStartTime;

/** Return a version of the loaded shows with start time resolved for the
 * given date - a show with two performances that day becomes two entries,
 * one per performance. No sorting or filtering is done at this stage. */
export function getFavourites(shows: Show[], date: number | null): ShowInfo[] {
  return shows.flatMap((show) =>
    processStartTime(show, date).map((startTime) => ({
      ...show,
      ...startTime,
    })),
  );
}
