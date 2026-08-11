import { unknownDate, type PerformanceTime, type Show, type TimesT } from "./data/types";

function dropUnavailableTimes(times: TimesT, noAvailability: number[]): TimesT {
  if (typeof times === "string") {
    return times;
  }
  const filtered: Record<number, PerformanceTime> = {};
  for (const [dateKey, performanceTime] of Object.entries(times)) {
    if (!noAvailability.includes(Number(dateKey))) {
      filtered[Number(dateKey)] = performanceTime;
    }
  }
  return filtered;
}

/** When enabled, a date with no allocation remaining is dropped from a
 * show's dates (and its time, if any) as though the show simply isn't on
 * that day - so it's skipped when picking the next performance, and won't
 * resolve a time if directly selected. Booked shows are exempt: a ticket
 * is already held, so a later availability change for that date doesn't
 * matter - see get-favourites.ts's effectiveDate for the same idea. */
export function filterAvailableDates(
  shows: Show[],
  availableOnly: boolean,
): Show[] {
  if (!availableOnly) {
    return shows;
  }
  return shows.map((show) => {
    if (show.booked || show.noAvailability.length === 0) {
      return show;
    }
    const dates =
      show.dates === unknownDate
        ? unknownDate
        : show.dates.filter((d) => !show.noAvailability.includes(d));
    return {
      ...show,
      dates,
      times: dropUnavailableTimes(show.times, show.noAvailability),
      noAvailability: [],
    };
  });
}
