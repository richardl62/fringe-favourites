import type { ShowInfo } from "./get-favourites";

// The "Min rating" select's value: a digit for a minimum rating (0, 1, or 2 -
// the permitted range, see data/shows.ts's parseNotes - an unrated show
// counts as 0), or "b" for booked shows only. "0" also serves as "no
// filter", since every show's rating is already >= 0.
export type MinRating = "0" | "1" | "2" | "b";

/** Filter shows by the "Min rating" option. Booked shows are always
 * included regardless of the filter - see sort-favourites.ts's
 * compareRatings for the same "booked counts as the highest rating" idea. */
export function filterByMinRating(
  favourites: ShowInfo[],
  minRating: MinRating,
): ShowInfo[] {
  return favourites.filter((info) => {
    if (info.booked) {
      return true;
    }
    if (minRating === "b") {
      return false;
    }
    return info.rating >= Number(minRating);
  });
}
