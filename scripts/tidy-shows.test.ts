import { parseDocument, YAMLMap } from "yaml";
import { describe, expect, it } from "vitest";
import {
  addMissingRatings,
  pruneDatesBeforeStartDate,
  sortEntries,
} from "./tidy-shows.ts";

function parse(yamlText: string) {
  const doc = parseDocument(yamlText);
  return { doc, root: doc.contents as YAMLMap };
}

function asRecord(doc: ReturnType<typeof parseDocument>): Record<string, unknown> {
  return doc.toJS() as Record<string, unknown>;
}

function entryOf(
  doc: ReturnType<typeof parseDocument>,
  id: string,
): Record<string, unknown> {
  return asRecord(doc)[id] as Record<string, unknown>;
}

describe("pruneDatesBeforeStartDate", () => {
  it("does nothing when startDate is undefined", () => {
    const { doc, root } = parse(`
a-show:
  dates: [10, 20, 30]
`);
    pruneDatesBeforeStartDate(doc, root, undefined);
    expect(entryOf(doc, "a-show").dates).toEqual([10, 20, 30]);
  });

  it("drops dates before startDate", () => {
    const { doc, root } = parse(`
a-show:
  dates: [10, 20, 30]
`);
    pruneDatesBeforeStartDate(doc, root, 25);
    expect(entryOf(doc, "a-show").dates).toEqual([30]);
  });

  it("keeps a booked date even if it's before startDate", () => {
    const { doc, root } = parse(`
a-show:
  booked: 10
  dates: [10, 20, 30]
`);
    pruneDatesBeforeStartDate(doc, root, 25);
    expect(entryOf(doc, "a-show").dates).toEqual([10, 30]);
  });

  it("prunes stale entries out of times, deleting the field once empty", () => {
    const { doc, root } = parse(`
a-show:
  dates: [10, 20]
  times: {10: "20:00", 20: "21:00"}
`);
    pruneDatesBeforeStartDate(doc, root, 25);
    expect(entryOf(doc, "a-show").times).toBeUndefined();
  });

  it("keeps times entries on or after startDate", () => {
    const { doc, root } = parse(`
a-show:
  dates: [10, 20, 30]
  times: {10: "20:00", 20: "21:00", 30: "22:00"}
`);
    pruneDatesBeforeStartDate(doc, root, 25);
    expect(entryOf(doc, "a-show").times).toEqual({ 30: "22:00" });
  });

  it("deletes noAvailability once every entry is pruned", () => {
    const { doc, root } = parse(`
a-show:
  dates: [10, 20]
  noAvailability: [10]
`);
    pruneDatesBeforeStartDate(doc, root, 25);
    expect(entryOf(doc, "a-show").noAvailability).toBeUndefined();
  });

  it("leaves a non-date-bearing entry alone", () => {
    const { doc, root } = parse(`
a-show:
  rating: 1
`);
    expect(() => {
      pruneDatesBeforeStartDate(doc, root, 25);
    }).not.toThrow();
  });
});

describe("addMissingRatings", () => {
  it("doesn't treat startDate as a show entry needing a rating", () => {
    const { doc, root } = parse(`
startDate: 28

a-show:
  booked: 10
`);
    expect(() => {
      addMissingRatings(doc, root);
    }).not.toThrow();
    expect(asRecord(doc).startDate).toBe(28);
  });

  it("still throws for a genuinely malformed entry", () => {
    const { doc, root } = parse(`
a-show: 5
`);
    expect(() => {
      addMissingRatings(doc, root);
    }).toThrow('shows.yaml entry "a-show" isn\'t a mapping');
  });
});

describe("sortEntries", () => {
  it("keeps startDate first regardless of alphabetical order", () => {
    const { root } = parse(`
zzz-show:
  rating: 1

startDate: 28

aaa-show:
  rating: 1
`);
    sortEntries(root);
    expect(root.items.map((item) => String(item.key))).toEqual([
      "startDate",
      "aaa-show",
      "zzz-show",
    ]);
  });
});
