import { describe, expect, it } from "vitest";
import type { Show } from "./data/types";
import { unknownDate } from "./data/types";
import { filterAvailableDates } from "./filter-available-dates";

function show(overrides: Partial<Show> = {}): Show {
  return {
    id: "a-show",
    title: "A Show",
    venue: "A Venue",
    url: "https://example.com/a-show",
    durationMinutes: 60,
    dates: [10, 11, 12],
    rating: 1,
    unrated: false,
    booked: false,
    times: {
      10: { kind: "single", time: "19:00" },
      11: { kind: "single", time: "19:00" },
      12: { kind: "single", time: "19:00" },
    },
    noAvailability: [],
    ...overrides,
  };
}

describe("filterAvailableDates", () => {
  it("returns shows unchanged when availableOnly is false", () => {
    const shows = [show({ noAvailability: [11] })];

    expect(filterAvailableDates(shows, false)).toBe(shows);
  });

  it("returns a show unchanged when it has no unavailable dates", () => {
    const shows = [show()];

    expect(filterAvailableDates(shows, true)).toEqual(shows);
  });

  it("drops an unavailable date from dates and times", () => {
    const [result] = filterAvailableDates(
      [show({ noAvailability: [11] })],
      true,
    );

    expect(result.dates).toEqual([10, 12]);
    expect(result.times).toEqual({
      10: { kind: "single", time: "19:00" },
      12: { kind: "single", time: "19:00" },
    });
    expect(result.noAvailability).toEqual([]);
  });

  it("leaves a fixed single start time untouched", () => {
    const [result] = filterAvailableDates(
      [show({ times: "19:00", noAvailability: [11] })],
      true,
    );

    expect(result.times).toBe("19:00");
    expect(result.dates).toEqual([10, 12]);
  });

  it("leaves unknownDate dates untouched", () => {
    const [result] = filterAvailableDates(
      [show({ dates: unknownDate, times: "19:00", noAvailability: [11] })],
      true,
    );

    expect(result.dates).toBe(unknownDate);
  });

  it("exempts a booked show even if its date is marked unavailable", () => {
    const booked = show({
      booked: true,
      dates: [11],
      times: { 11: { kind: "single", time: "19:00" } },
      noAvailability: [11],
    });

    const [result] = filterAvailableDates([booked], true);

    expect(result).toEqual(booked);
  });
});
