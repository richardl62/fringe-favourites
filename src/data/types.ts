export const unknownDate = "?";
export type DatesT = number[] | typeof unknownDate;

/** A date's performance time(s): a single known time, exactly two known
 * times (the date has two performances, shown as separate entries on the
 * page), or "many" for three or more performances, whose times are left
 * unspecified. */
export type PerformanceTime =
  | { kind: "single"; time: string }
  | { kind: "double"; times: [string, string] }
  | { kind: "many" };

// A show's start time: a single fixed "HH:MM", or a (possibly incomplete) map
// of date -> performance time(s) for shows whose time varies by performance.
export type TimesT = string | Record<number, PerformanceTime>;

/** A show as read from its source (edfringe.com CSV or shows.yaml),
 * before shows.yaml's notes have been applied. */
export interface RawShow {
  id: string;
  title: string;
  venue: string;
  url: string;
  durationMinutes: number;
  // null means the source only tells us the time varies, with no single value.
  startTime: string | null;
}

/** A show combined with its hand-written notes (rating, dates, booking, times). */
export interface Show {
  id: string;
  title: string;
  venue: string;
  url: string;
  durationMinutes: number;
  dates: DatesT;
  rating: number;
  // True when shows.yaml has no "rating" for this show - distinct from an
  // explicit `rating: 0`, which also leaves `rating` at 0.
  unrated: boolean;
  booked: boolean;
  times: TimesT;
  // Day-of-month numbers with no allocation remaining, per edfringe.com's
  // own "no allocation remaining" date indicator.
  noAvailability: number[];
}
