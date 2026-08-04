import type { ShowInfo } from "./get-favourites";

// The "Min rating" select's value: "" for no filter, a digit for a minimum
// rating (excluding unrated shows), or "b" for booked shows only.
export type MinRating = "" | "0" | "1" | "2" | "3" | "b";

/** Filter shows by the "Min rating" option. Booked shows are always
 * included regardless of the filter - see sort-favourites.ts's
 * compareRatings for the same "booked counts as the highest rating" idea. */
export function filterByMinRating(
  favourites: ShowInfo[],
  minRating: MinRating,
): ShowInfo[] {
  if (minRating === "") {
    return favourites;
  }
  return favourites.filter((info) => {
    if (info.booked) {
      return true;
    }
    if (minRating === "b") {
      return false;
    }
    return !info.unrated && info.rating >= Number(minRating);
  });
}
