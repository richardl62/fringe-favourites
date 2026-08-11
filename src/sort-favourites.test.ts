import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExtendedShowInfo } from "./add-next-performance";
import { unknownDate } from "./data/types";
import { sortFavourites } from "./sort-favourites";

function info(overrides: Partial<ExtendedShowInfo> = {}): ExtendedShowInfo {
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
    noAvailability: [],
    startTime: null,
    startTimeVaries: false,
    startTimeUnavailable: false,
    nextPerformance: 10,
    nextPerformanceUnavailable: false,
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("sortFavourites", () => {
  it("sorts a booked show first regardless of rating", () => {
    const highRated = info({ id: "high-rated", rating: 3 });
    const booked = info({ id: "booked", rating: 0, booked: true });
    const favourites = [highRated, booked];

    sortFavourites({ favourites, sortByRating: true, sortByDate: false });

    expect(favourites.map((f) => f.id)).toEqual(["booked", "high-rated"]);
  });

  it("sorts by descending rating when sortByRating is set", () => {
    const low = info({ id: "low", rating: 1 });
    const high = info({ id: "high", rating: 3 });
    const favourites = [low, high];

    sortFavourites({ favourites, sortByRating: true, sortByDate: false });

    expect(favourites.map((f) => f.id)).toEqual(["high", "low"]);
  });

  it("sorts by ascending next-performance date when sortByDate is set", () => {
    const later = info({ id: "later", nextPerformance: 20 });
    const earlier = info({ id: "earlier", nextPerformance: 10 });
    const favourites = [later, earlier];

    sortFavourites({ favourites, sortByRating: false, sortByDate: true });

    expect(favourites.map((f) => f.id)).toEqual(["earlier", "later"]);
  });

  it("treats an unknown next-performance date as today's date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 15));

    const unknown = info({ id: "unknown", nextPerformance: unknownDate });
    const before = info({ id: "before", nextPerformance: 10 });
    const after = info({ id: "after", nextPerformance: 20 });
    const favourites = [after, unknown, before];

    sortFavourites({ favourites, sortByRating: false, sortByDate: true });

    expect(favourites.map((f) => f.id)).toEqual(["before", "unknown", "after"]);
  });

  it("falls back to sorting by start time when dates and ratings are equal", () => {
    const later = info({ id: "later", startTime: "20:00" });
    const earlier = info({ id: "earlier", startTime: "10:00" });
    const unset = info({ id: "unset", startTime: null });
    const favourites = [unset, later, earlier];

    sortFavourites({ favourites, sortByRating: false, sortByDate: false });

    expect(favourites.map((f) => f.id)).toEqual(["earlier", "later", "unset"]);
  });

  it("prioritises date over rating when both are enabled", () => {
    const earlierLowRated = info({ id: "earlier", nextPerformance: 10, rating: 0 });
    const laterHighRated = info({ id: "later", nextPerformance: 20, rating: 3 });
    const favourites = [laterHighRated, earlierLowRated];

    sortFavourites({ favourites, sortByRating: true, sortByDate: true });

    expect(favourites.map((f) => f.id)).toEqual(["earlier", "later"]);
  });
});
