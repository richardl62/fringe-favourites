import { describe, expect, it } from "vitest";
import type { Problem } from "./problems";
import { parseShows } from "./shows";

function parse(text: string) {
  const problems: Problem[] = [];
  const result = parseShows(text, problems);
  return { ...result, problems };
}

function hasProblem(
  problems: Problem[],
  predicate: (problem: Problem) => boolean,
): boolean {
  return problems.some(predicate);
}

describe("parseShows", () => {
  it("parses a full raw-fields entry", () => {
    const { rawShows, problems } = parse(`
free-fringe-show:
  title: Free Fringe Show
  venue: A Cellar
  duration: "1:15"
  startTime: "20:30"
  url: https://example.com/free-fringe-show
`);

    expect(problems).toHaveLength(0);
    expect(rawShows).toEqual([
      {
        id: "free-fringe-show",
        title: "Free Fringe Show",
        venue: "A Cellar",
        url: "https://example.com/free-fringe-show",
        durationMinutes: 75,
        startTime: "20:30",
      },
    ]);
  });

  it("treats a missing startTime as null (variable)", () => {
    const { rawShows, problems } = parse(`
free-fringe-show:
  title: Free Fringe Show
  venue: A Cellar
  duration: "1:00"
  url: https://example.com/free-fringe-show
`);

    expect(problems).toHaveLength(0);
    expect(rawShows[0].startTime).toBeNull();
  });

  it("rejects the literal string 'varies' for startTime", () => {
    const { rawShows, problems } = parse(`
free-fringe-show:
  title: Free Fringe Show
  venue: A Cellar
  duration: "1:00"
  startTime: varies
  url: https://example.com/free-fringe-show
`);

    expect(rawShows).toHaveLength(0);
    expect(
      hasProblem(problems, (p) =>
        p.message.includes('"startTime" should be "HH:MM", got "varies"'),
      ),
    ).toBe(true);
  });

  it("parses rating/dates/booked/times notes", () => {
    const { notesById, problems } = parse(`
a-show:
  rating: 2
  dates: [10, 11, 12]
  times: {10: "20:00", 11: "20:00-21:30", 12: "many"}
`);

    expect(problems).toHaveLength(0);
    expect(notesById.get("a-show")).toEqual({
      rating: 2,
      dates: [10, 11, 12],
      times: {
        10: { kind: "single", time: "20:00" },
        11: { kind: "double", times: ["20:00", "21:30"] },
        12: { kind: "many" },
      },
    });
  });

  it("parses noAvailability", () => {
    const { notesById, problems } = parse(`
a-show:
  rating: 1
  dates: [10, 11]
  noAvailability: [11]
`);

    expect(problems).toHaveLength(0);
    expect(notesById.get("a-show")?.noAvailability).toEqual([11]);
  });

  it("rejects a non-numeric noAvailability entry", () => {
    const { notesById, problems } = parse(`
a-show:
  rating: 1
  dates: [10]
  noAvailability: ["eleven"]
`);

    expect(notesById.has("a-show")).toBe(false);
    expect(
      hasProblem(problems, (p) =>
        p.message.includes('"noAvailability" should be a list of day-of-month numbers'),
      ),
    ).toBe(true);
  });

  it("treats a '?' rating as no rating", () => {
    const { notesById } = parse(`
a-show:
  rating: "?"
  dates: [10]
`);

    expect(notesById.get("a-show")?.rating).toBeUndefined();
  });

  it("rejects a rating outside 0, 1, or 2", () => {
    const { notesById, problems } = parse(`
a-show:
  rating: 3
  dates: [10]
`);

    expect(notesById.has("a-show")).toBe(false);
    expect(
      hasProblem(problems, (p) => p.message.includes('"rating" should be 0, 1, 2, or "?"')),
    ).toBe(true);
  });

  it("rejects an unknown field", () => {
    const { notesById, problems } = parse(`
a-show:
  rating: 1
  nonsense: true
`);

    expect(notesById.has("a-show")).toBe(false);
    expect(
      hasProblem(problems, (p) => p.message.includes("unknown field(s): nonsense")),
    ).toBe(true);
  });

  it("rejects an invalid duration", () => {
    const { rawShows, problems } = parse(`
a-show:
  title: A Show
  venue: A Venue
  duration: "1h15"
  startTime: "20:00"
  url: https://example.com/a-show
`);

    expect(rawShows).toHaveLength(0);
    expect(
      hasProblem(problems, (p) => p.message.includes('"duration" should look like "1:15"')),
    ).toBe(true);
  });

  it("rejects a non-numeric dates entry", () => {
    const { notesById, problems } = parse(`
a-show:
  rating: 1
  dates: [10, "eleven"]
`);

    expect(notesById.has("a-show")).toBe(false);
    expect(
      hasProblem(problems, (p) =>
        p.message.includes('"dates" should be a list of day-of-month numbers'),
      ),
    ).toBe(true);
  });

  it("rejects a non-numeric booked value", () => {
    const { problems } = parse(`
a-show:
  rating: 1
  dates: [10]
  booked: "10th"
`);

    expect(
      hasProblem(problems, (p) =>
        p.message.includes('"booked" should be a day-of-month number'),
      ),
    ).toBe(true);
  });

  it("parses bookedTime alongside booked", () => {
    const { notesById, problems } = parse(`
a-show:
  rating: 1
  booked: 10
  bookedTime: "20:00"
`);

    expect(problems).toHaveLength(0);
    expect(notesById.get("a-show")).toEqual({
      rating: 1,
      booked: 10,
      bookedTime: "20:00",
    });
  });

  it("rejects a malformed bookedTime value", () => {
    const { notesById, problems } = parse(`
a-show:
  rating: 1
  booked: 10
  bookedTime: "8pm"
`);

    expect(notesById.has("a-show")).toBe(false);
    expect(
      hasProblem(problems, (p) => p.message.includes('"bookedTime" should be "HH:MM"')),
    ).toBe(true);
  });

  it("rejects bookedTime without booked", () => {
    const { notesById, problems } = parse(`
a-show:
  rating: 1
  dates: [10]
  bookedTime: "20:00"
`);

    expect(notesById.has("a-show")).toBe(false);
    expect(
      hasProblem(problems, (p) =>
        p.message.includes('"bookedTime" needs "booked" to also be set'),
      ),
    ).toBe(true);
  });

  it("rejects a malformed times entry", () => {
    const { problems } = parse(`
a-show:
  rating: 1
  dates: [10]
  times: {10: "not a time"}
`);

    expect(
      hasProblem(problems, (p) =>
        p.message.includes(
          '"times" for date 10 should be "HH:MM", "HH:MM-HH:MM", or "many", got "not a time"',
        ),
      ),
    ).toBe(true);
  });

  it("reports a top-level YAML syntax error without throwing", () => {
    const { rawShows, notesById, problems } = parse(`
a-show: [this is not a mapping
`);

    expect(rawShows).toEqual([]);
    expect(notesById.size).toBe(0);
    expect(
      hasProblem(
        problems,
        (p) => p.severity === "error" && p.message.includes("shows.yaml:"),
      ),
    ).toBe(true);
  });

  it("records the line each entry starts on", () => {
    const { entryLines } = parse(`
first-show:
  rating: 1
  dates: [10]

second-show:
  rating: 2
  dates: [11]
`);

    expect(entryLines.get("first-show")).toBe(2);
    expect(entryLines.get("second-show")).toBe(6);
  });
});
