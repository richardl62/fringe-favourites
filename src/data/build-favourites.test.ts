import { describe, expect, it } from "vitest";
import { buildFavourites } from "./build-favourites";
import type { Problem } from "./problems";
import type { ShowNotes } from "./shows";
import { unknownDate, type RawShow } from "./types";

function rawShow(overrides: Partial<RawShow> = {}): RawShow {
  return {
    id: "a-show",
    title: "A Show",
    venue: "A Venue",
    url: "https://example.com/a-show",
    durationMinutes: 60,
    startTime: null,
    ...overrides,
  };
}

function build(rawShows: RawShow[], notesById: Map<string, ShowNotes>) {
  const problems: Problem[] = [];
  const shows = buildFavourites(rawShows, notesById, new Map(), 0, problems);
  return { shows, problems };
}

function hasProblem(
  problems: Problem[],
  predicate: (problem: Problem) => boolean,
): boolean {
  return problems.some(predicate);
}

describe("buildFavourites", () => {
  it("marks a show with no rating as unrated", () => {
    const notes: ShowNotes = { dates: [10] };
    const { shows, problems } = build([rawShow()], new Map([["a-show", notes]]));

    expect(shows[0].unrated).toBe(true);
    expect(shows[0].rating).toBe(0);
    expect(hasProblem(problems, (p) => p.severity === "unrated")).toBe(true);
  });

  it("does not report a booked show with no rating as unrated", () => {
    const notes: ShowNotes = {
      dates: [10],
      booked: 10,
      times: { 10: { kind: "single", time: "20:00" } },
    };
    const { shows, problems } = build([rawShow()], new Map([["a-show", notes]]));

    expect(shows[0].unrated).toBe(true);
    expect(hasProblem(problems, (p) => p.severity === "unrated")).toBe(false);
  });

  it("does not report a show with no shows.yaml entry as unrated", () => {
    const { problems } = build([rawShow()], new Map());

    expect(hasProblem(problems, (p) => p.severity === "unrated")).toBe(false);
    expect(
      hasProblem(problems, (p) => p.message.includes("has no entry in shows.yaml")),
    ).toBe(true);
  });

  it("carries through an explicit rating with no problem", () => {
    const notes: ShowNotes = {
      rating: 3,
      dates: [10],
      times: { 10: { kind: "single", time: "20:00" } },
    };
    const { shows, problems } = build([rawShow()], new Map([["a-show", notes]]));

    expect(shows[0].unrated).toBe(false);
    expect(shows[0].rating).toBe(3);
    expect(problems).toHaveLength(0);
  });

  it("warns when a show has notes but no dates", () => {
    const notes: ShowNotes = { rating: 1 };
    const { shows, problems } = build([rawShow()], new Map([["a-show", notes]]));

    expect(shows[0].dates).toBe(unknownDate);
    expect(
      hasProblem(problems, (p) => p.message.includes('has no "dates" in shows.yaml')),
    ).toBe(true);
  });

  it("warns when booked for a date not in the dates list", () => {
    const notes: ShowNotes = { rating: 1, dates: [10, 11], booked: 12 };
    const { shows, problems } = build([rawShow()], new Map([["a-show", notes]]));

    expect(shows[0].dates).toEqual([12]);
    expect(shows[0].booked).toBe(true);
    expect(
      hasProblem(problems, (p) =>
        p.message.includes('is "booked" for a date not in its "dates" list'),
      ),
    ).toBe(true);
  });

  it("does not warn when booked for a date that is in the dates list", () => {
    const notes: ShowNotes = {
      rating: 1,
      dates: [10, 11],
      booked: 11,
      times: { 11: { kind: "single", time: "20:00" } },
    };
    const { problems } = build([rawShow()], new Map([["a-show", notes]]));

    expect(problems).toHaveLength(0);
  });

  it("ignores shows.yaml time overrides for a show with a single fixed start time", () => {
    const notes: ShowNotes = {
      rating: 1,
      dates: [10],
      times: { 10: { kind: "single", time: "20:00" } },
    };
    const { shows, problems } = build(
      [rawShow({ startTime: "19:00" })],
      new Map([["a-show", notes]]),
    );

    expect(shows[0].times).toBe("19:00");
    expect(hasProblem(problems, (p) => p.message.includes("ignoring them"))).toBe(
      true,
    );
  });

  it("warns about dates missing a time override", () => {
    const notes: ShowNotes = {
      rating: 1,
      dates: [10, 11, 12],
      times: { 10: { kind: "single", time: "20:00" } },
    };
    const { problems } = build([rawShow()], new Map([["a-show", notes]]));

    expect(
      hasProblem(problems, (p) =>
        p.message.includes("no specific time recorded for date(s) 11, 12"),
      ),
    ).toBe(true);
  });

  it("warns about a stale time override for a date not in the dates list", () => {
    const notes: ShowNotes = {
      rating: 1,
      dates: [10],
      times: {
        10: { kind: "single", time: "20:00" },
        11: { kind: "single", time: "20:00" },
      },
    };
    const { problems } = build([rawShow()], new Map([["a-show", notes]]));

    expect(
      hasProblem(problems, (p) =>
        p.message.includes("has a start-time override for date(s) 11 not in its dates list"),
      ),
    ).toBe(true);
  });

  it("does not warn about a stale override once the show is booked", () => {
    const notes: ShowNotes = {
      rating: 1,
      dates: [10, 11],
      booked: 10,
      times: {
        10: { kind: "single", time: "20:00" },
        11: { kind: "single", time: "20:00" },
      },
    };
    const { problems } = build([rawShow()], new Map([["a-show", notes]]));

    expect(hasProblem(problems, (p) => p.message.includes("start-time override"))).toBe(
      false,
    );
  });

  it("reports a 'many' date as multiplePerformances rather than a missing override", () => {
    const notes: ShowNotes = {
      rating: 1,
      dates: [10, 11],
      times: {
        10: { kind: "single", time: "20:00" },
        11: { kind: "many" },
      },
    };
    const { shows, problems } = build([rawShow()], new Map([["a-show", notes]]));

    expect(shows[0].times).toEqual({
      10: { kind: "single", time: "20:00" },
      11: { kind: "many" },
    });
    expect(
      hasProblem(
        problems,
        (p) => p.severity === "multiplePerformances" && p.message === ": Dates 11",
      ),
    ).toBe(true);
    expect(
      hasProblem(problems, (p) => p.message.includes("no specific time recorded")),
    ).toBe(false);
  });

  it("carries through noAvailability dates with no problem", () => {
    const notes: ShowNotes = {
      rating: 1,
      dates: [10, 11],
      times: {
        10: { kind: "single", time: "20:00" },
        11: { kind: "single", time: "20:00" },
      },
      noAvailability: [11],
    };
    const { shows, problems } = build([rawShow()], new Map([["a-show", notes]]));

    expect(shows[0].noAvailability).toEqual([11]);
    expect(problems).toHaveLength(0);
  });

  it("defaults noAvailability to an empty list when not given", () => {
    const notes: ShowNotes = {
      rating: 1,
      dates: [10],
      times: { 10: { kind: "single", time: "20:00" } },
    };
    const { shows } = build([rawShow()], new Map([["a-show", notes]]));

    expect(shows[0].noAvailability).toEqual([]);
  });

  it("warns about a noAvailability entry for a date not in the dates list", () => {
    const notes: ShowNotes = {
      rating: 1,
      dates: [10],
      times: { 10: { kind: "single", time: "20:00" } },
      noAvailability: [11],
    };
    const { problems } = build([rawShow()], new Map([["a-show", notes]]));

    expect(
      hasProblem(problems, (p) =>
        p.message.includes(
          'has a "no availability" entry for date(s) 11 not in its dates list',
        ),
      ),
    ).toBe(true);
  });

  it("does not warn about a stale noAvailability entry once the show is booked", () => {
    const notes: ShowNotes = {
      rating: 1,
      dates: [10, 11],
      booked: 10,
      times: {
        10: { kind: "single", time: "20:00" },
        11: { kind: "single", time: "20:00" },
      },
      noAvailability: [11],
    };
    const { problems } = build([rawShow()], new Map([["a-show", notes]]));

    expect(
      hasProblem(problems, (p) => p.message.includes("no availability")),
    ).toBe(false);
  });

  it("warns about a shows.yaml entry with no matching CSV show", () => {
    const notes: ShowNotes = { rating: 1, dates: [10] };
    const { problems } = build([], new Map([["orphan-show", notes]]));

    expect(
      hasProblem(problems, (p) =>
        p.message.includes(
          'shows.yaml entry "orphan-show" has no matching show in my_fringe_favourites.csv',
        ),
      ),
    ).toBe(true);
  });
});
