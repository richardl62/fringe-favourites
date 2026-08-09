import { describe, expect, it } from "vitest";
import type { Show, TimesT } from "./data/types";
import { getFavourites } from "./get-favourites";

function show(times: TimesT, overrides: Partial<Show> = {}): Show {
  return {
    id: "a-show",
    title: "A Show",
    venue: "A Venue",
    url: "https://example.com/a-show",
    durationMinutes: 60,
    dates: [10],
    rating: 1,
    unrated: false,
    booked: false,
    times,
    ...overrides,
  };
}

describe("getFavourites", () => {
  it("uses a fixed start time regardless of the selected date", () => {
    const [info] = getFavourites([show("19:00")], 10);

    expect(info.startTime).toBe("19:00");
    expect(info.startTimeVaries).toBe(false);
  });

  it("resolves to no start time when no date is selected", () => {
    const [info] = getFavourites(
      [show({ 10: { kind: "single", time: "19:00" } })],
      null,
    );

    expect(info.startTime).toBeNull();
    expect(info.startTimeVaries).toBe(true);
  });

  it("resolves to no start time when the date has no override", () => {
    const [info] = getFavourites(
      [show({ 10: { kind: "single", time: "19:00" } })],
      11,
    );

    expect(info.startTime).toBeNull();
    expect(info.startTimeVaries).toBe(true);
  });

  it("resolves a single known start time for the selected date", () => {
    const [info] = getFavourites(
      [show({ 10: { kind: "single", time: "19:00" } })],
      10,
    );

    expect(info.startTime).toBe("19:00");
    expect(info.startTimeVaries).toBe(true);
  });

  it("splits a date with two performances into two entries", () => {
    const infos = getFavourites(
      [show({ 10: { kind: "double", times: ["10:30", "12:30"] } })],
      10,
    );

    expect(infos).toHaveLength(2);
    expect(infos.map((i) => i.startTime)).toEqual(["10:30", "12:30"]);
    expect(infos.every((i) => i.startTimeVaries)).toBe(true);
    expect(infos.every((i) => i.title === "A Show")).toBe(true);
  });

  it("resolves to no start time for a 'many' date", () => {
    const [info] = getFavourites([show({ 10: { kind: "many" } })], 10);

    expect(info.startTime).toBeNull();
    expect(info.startTimeVaries).toBe(true);
  });

  it("resolves a booked show's start time from its booked date, regardless of the selected date", () => {
    const [info] = getFavourites(
      [
        show(
          { 20: { kind: "single", time: "19:00" } },
          { booked: true, dates: [20] },
        ),
      ],
      10,
    );

    expect(info.startTime).toBe("19:00");
    expect(info.startTimeVaries).toBe(true);
  });

  it("resolves a booked show's start time even when no date is selected", () => {
    const [info] = getFavourites(
      [
        show(
          { 20: { kind: "single", time: "19:00" } },
          { booked: true, dates: [20] },
        ),
      ],
      null,
    );

    expect(info.startTime).toBe("19:00");
  });

  it("processes multiple shows independently", () => {
    const infos = getFavourites(
      [
        show("19:00", { id: "fixed-show" }),
        show({ 10: { kind: "double", times: ["10:30", "12:30"] } }, { id: "double-show" }),
      ],
      10,
    );

    expect(infos.map((i) => i.id)).toEqual(["fixed-show", "double-show", "double-show"]);
  });
});
