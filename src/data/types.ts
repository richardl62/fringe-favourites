export const unknownDate = "?";
export type DatesT = number[] | typeof unknownDate;

// A show's start time: a single fixed "HH:MM", or a (possibly incomplete) map
// of date -> "HH:MM" for shows whose time varies by performance.
export type TimesT = string | Record<number, string>;

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
  booked: boolean;
  times: TimesT;
}
