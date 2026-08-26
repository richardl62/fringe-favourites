import { describe, expect, it } from "vitest";
import {
  buildSchedule,
  resolveTimesToWrite,
  type Performance,
} from "./fetch-dates.ts";

function performance(overrides: Partial<Performance> = {}): Performance {
  return {
    dateTime: "2026-08-10T19:00:00.000Z",
    cancelled: false,
    ticketStatus: "TICKETS_AVAILABLE",
    ...overrides,
  };
}

describe("buildSchedule", () => {
  it("reports no schedule when there are no non-cancelled performances", () => {
    const schedule = buildSchedule([performance({ cancelled: true })]);

    expect(schedule).toEqual({
      dates: [],
      times: null,
      noAvailability: [],
      problems: ["no non-cancelled performances were found"],
    });
  });

  it("fully populates times even when every date shares the same time", () => {
    const schedule = buildSchedule([
      performance({ dateTime: "2026-08-10T19:00:00.000Z" }),
      performance({ dateTime: "2026-08-11T19:00:00.000Z" }),
    ]);

    expect(schedule.dates).toEqual([10, 11]);
    expect(schedule.times).toEqual(
      new Map([
        [10, "20:00"],
        [11, "20:00"],
      ]),
    );
    expect(schedule.problems).toEqual([]);
  });

  it("records two distinct times a day as 'HH:MM-HH:MM'", () => {
    const schedule = buildSchedule([
      performance({ dateTime: "2026-08-10T18:00:00.000Z" }),
      performance({ dateTime: "2026-08-10T20:00:00.000Z" }),
    ]);

    expect(schedule.times?.get(10)).toBe("19:00-21:00");
  });

  it("records three or more distinct times a day as 'many', with a problem", () => {
    const schedule = buildSchedule([
      performance({ dateTime: "2026-08-10T10:00:00.000Z" }),
      performance({ dateTime: "2026-08-10T14:00:00.000Z" }),
      performance({ dateTime: "2026-08-10T18:00:00.000Z" }),
    ]);

    expect(schedule.times?.get(10)).toBe("many");
    expect(schedule.problems).toContain(
      "some dates have more than two performances",
    );
  });

  it("marks a date as noAvailability only when every performance that day is sold out", () => {
    const schedule = buildSchedule([
      performance({
        dateTime: "2026-08-10T10:00:00.000Z",
        ticketStatus: "NO_ALLOCATION_CONTACT_VENUE",
      }),
      performance({
        dateTime: "2026-08-11T10:00:00.000Z",
        ticketStatus: "NO_ALLOCATION_CONTACT_VENUE",
      }),
      performance({
        dateTime: "2026-08-11T14:00:00.000Z",
        ticketStatus: "TICKETS_AVAILABLE",
      }),
    ]);

    expect(schedule.noAvailability).toEqual([10]);
  });
});

describe("resolveTimesToWrite", () => {
  const times = new Map([[10, "20:00"]]);

  it("writes times when startTime is 'varies', even if uniform", () => {
    expect(resolveTimesToWrite(times, "varies")).toBe(times);
  });

  it("doesn't write times when startTime is a fixed time", () => {
    expect(resolveTimesToWrite(times, "20:00")).toBeNull();
  });

  it("doesn't write times when startTime hasn't been synced yet", () => {
    expect(resolveTimesToWrite(times, undefined)).toBeNull();
  });

  it("stays null when there's no schedule to write at all", () => {
    expect(resolveTimesToWrite(null, "varies")).toBeNull();
  });
});
