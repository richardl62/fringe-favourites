import { parseDocument, YAMLMap, type Pair } from "yaml";
import { describe, expect, it } from "vitest";
import {
  clearRemovedFlagIfPresent,
  findRemovedCsvShows,
  formatStartTime,
  isCsvOwnedEntry,
} from "./sync-csv.ts";

describe("isCsvOwnedEntry", () => {
  it("is true for a matching edfringe.com whats-on url", () => {
    expect(
      isCsvOwnedEntry(
        "cathy",
        "https://www.edfringe.com/tickets/whats-on/cathy",
      ),
    ).toBe(true);
  });

  it("is false for a url whose id doesn't match the entry's key", () => {
    expect(
      isCsvOwnedEntry(
        "cathy",
        "https://www.edfringe.com/tickets/whats-on/some-other-show",
      ),
    ).toBe(false);
  });

  it("is false for a non-edfringe.com url", () => {
    expect(
      isCsvOwnedEntry(
        "angels-in-america",
        "https://www.eif.co.uk/events/angels-in-america",
      ),
    ).toBe(false);
    expect(
      isCsvOwnedEntry(
        "some-free-fringe-show",
        "https://www.freefringe.org.uk/shows/some-free-fringe-show/",
      ),
    ).toBe(false);
  });

  it("is false when there's no url at all", () => {
    expect(isCsvOwnedEntry("a-show", undefined)).toBe(false);
    expect(isCsvOwnedEntry("a-show", 42)).toBe(false);
  });
});

describe("findRemovedCsvShows", () => {
  it("flags a CSV-owned show missing from the current CSV", () => {
    const entries = [
      {
        id: "cathy",
        url: "https://www.edfringe.com/tickets/whats-on/cathy",
      },
    ];
    expect(findRemovedCsvShows(entries, new Set())).toEqual(["cathy"]);
  });

  it("does not flag a show still in the current CSV", () => {
    const entries = [
      {
        id: "cathy",
        url: "https://www.edfringe.com/tickets/whats-on/cathy",
      },
    ];
    expect(findRemovedCsvShows(entries, new Set(["cathy"]))).toEqual([]);
  });

  it("does not flag a non-CSV-owned entry, even if its id isn't in the CSV", () => {
    const entries = [
      {
        id: "angels-in-america",
        url: "https://www.eif.co.uk/events/angels-in-america",
      },
    ];
    expect(findRemovedCsvShows(entries, new Set())).toEqual([]);
  });
});

function firstPair(yamlText: string): Pair {
  const doc = parseDocument(yamlText);
  const root = doc.contents as YAMLMap;
  return root.items[0];
}

function commentBeforeOf(pair: Pair): string | undefined {
  const key = pair.key as { commentBefore?: string };
  return key.commentBefore;
}

describe("clearRemovedFlagIfPresent", () => {
  it("clears its own 'removed' flag", () => {
    const pair = firstPair(`
# PROBLEM: no longer in my_fringe_favourites.csv - raw fields left as they are; delete this entry by hand if you no longer want it
a-show:
  title: A Show
`);
    clearRemovedFlagIfPresent(pair);

    expect(commentBeforeOf(pair)).toBeUndefined();
  });

  it("leaves an unrelated PROBLEM comment (e.g. from fetch-dates.ts) untouched", () => {
    const pair = firstPair(`
# PROBLEM: some dates have more than two performances
a-show:
  title: A Show
`);
    clearRemovedFlagIfPresent(pair);

    expect(commentBeforeOf(pair)).toContain(
      "some dates have more than two performances",
    );
  });

  it("does nothing when there's no comment at all", () => {
    const pair = firstPair(`
a-show:
  title: A Show
`);
    expect(() => {
      clearRemovedFlagIfPresent(pair);
    }).not.toThrow();
  });
});

describe("formatStartTime", () => {
  it("returns 'varies' for null", () => {
    expect(formatStartTime(null)).toBe("varies");
  });

  it("passes a specific time through unchanged", () => {
    expect(formatStartTime("20:00")).toBe("20:00");
  });
});
