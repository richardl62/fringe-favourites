import { describe, expect, it } from "vitest";
import type { ShowInfo } from "./get-favourites";
import { filterByMinRating } from "./filter-by-min-rating";

function info(overrides: Partial<ShowInfo> = {}): ShowInfo {
  return {
    id: "a-show",
    title: "A Show",
    venue: "A Venue",
    url: "https://example.com/a-show",
    durationMinutes: 60,
    dates: [10],
    rating: 0,
    unrated: false,
    booked: false,
    times: "20:00",
    startTime: null,
    startTimeVaries: false,
    ...overrides,
  };
}

describe("filterByMinRating", () => {
  it("returns everything when the minimum is 0, since every rating qualifies", () => {
    const favourites = [info({ rating: 0 }), info({ rating: 2, unrated: true })];

    expect(filterByMinRating(favourites, "0")).toEqual(favourites);
  });

  it("excludes shows below the minimum rating", () => {
    const low = info({ id: "low", rating: 1 });
    const high = info({ id: "high", rating: 2 });

    const result = filterByMinRating([low, high], "2");

    expect(result.map((f) => f.id)).toEqual(["high"]);
  });

  it("treats an unrated show as having rating 0", () => {
    const unrated = info({ id: "unrated", rating: 0, unrated: true });

    expect(filterByMinRating([unrated], "0").map((f) => f.id)).toEqual(["unrated"]);
    expect(filterByMinRating([unrated], "1")).toEqual([]);
  });

  it("keeps a booked show regardless of the minimum rating", () => {
    const booked = info({ id: "booked", rating: 0, unrated: true, booked: true });

    expect(filterByMinRating([booked], "2").map((f) => f.id)).toEqual(["booked"]);
  });

  it("only keeps booked shows when 'b' is selected", () => {
    const booked = info({ id: "booked", booked: true });
    const highRated = info({ id: "high-rated", rating: 2 });

    const result = filterByMinRating([booked, highRated], "b");

    expect(result.map((f) => f.id)).toEqual(["booked"]);
  });
});
