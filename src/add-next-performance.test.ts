import { describe, expect, it } from "vitest";
import { addNextPerformance } from "./add-next-performance";
import { unknownDate } from "./data/types";
import type { ShowInfo } from "./get-favourites";

function info(overrides: Partial<ShowInfo> = {}): ShowInfo {
  return {
    id: "a-show",
    title: "A Show",
    venue: "A Venue",
    url: "https://example.com/a-show",
    durationMinutes: 60,
    dates: [10, 15, 20],
    rating: 0,
    unrated: false,
    booked: false,
    times: "20:00",
    noAvailability: [],
    startTime: null,
    startTimeVaries: false,
    startTimeUnavailable: false,
    ...overrides,
  };
}

describe("addNextPerformance", () => {
  it("uses unknownDate for a show with unknown dates", () => {
    const [result] = addNextPerformance([info({ dates: unknownDate })], 12);

    expect(result.nextPerformance).toBe(unknownDate);
  });

  it("uses the first date when no start date is set", () => {
    const [result] = addNextPerformance([info()], null);

    expect(result.nextPerformance).toBe(10);
  });

  it("uses the first date on or after the start date", () => {
    const [result] = addNextPerformance([info()], 12);

    expect(result.nextPerformance).toBe(15);
  });

  it("includes a date that exactly matches the start date", () => {
    const [result] = addNextPerformance([info()], 15);

    expect(result.nextPerformance).toBe(15);
  });

  it("filters out a show with no date on or after the start date", () => {
    const result = addNextPerformance([info()], 21);

    expect(result).toHaveLength(0);
  });

  it("marks nextPerformance unavailable when it has no allocation remaining", () => {
    const [result] = addNextPerformance(
      [info({ dates: [10, 15, 20], noAvailability: [15] })],
      12,
    );

    expect(result.nextPerformance).toBe(15);
    expect(result.nextPerformanceUnavailable).toBe(true);
  });

  it("does not mark nextPerformance unavailable for a different date's entry", () => {
    const [result] = addNextPerformance(
      [info({ dates: [10, 15, 20], noAvailability: [10] })],
      12,
    );

    expect(result.nextPerformance).toBe(15);
    expect(result.nextPerformanceUnavailable).toBe(false);
  });

  it("never marks a booked show's nextPerformance unavailable, even if its date has no allocation remaining", () => {
    const [result] = addNextPerformance(
      [info({ dates: [10, 15, 20], booked: true, noAvailability: [15] })],
      12,
    );

    expect(result.nextPerformance).toBe(15);
    expect(result.nextPerformanceUnavailable).toBe(false);
  });

  it("is never unavailable when the next performance date is unknown", () => {
    const [result] = addNextPerformance(
      [info({ dates: unknownDate, noAvailability: [10] })],
      12,
    );

    expect(result.nextPerformance).toBe(unknownDate);
    expect(result.nextPerformanceUnavailable).toBe(false);
  });

  it("processes multiple shows independently", () => {
    const result = addNextPerformance(
      [
        info({ id: "no-more-dates", dates: [1] }),
        info({ id: "unknown-dates", dates: unknownDate }),
        info({ id: "has-a-later-date", dates: [1, 30] }),
      ],
      10,
    );

    expect(result.map((r) => [r.id, r.nextPerformance])).toEqual([
      ["unknown-dates", unknownDate],
      ["has-a-later-date", 30],
    ]);
  });
});
