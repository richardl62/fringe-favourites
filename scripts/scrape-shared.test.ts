import { parseDocument, YAMLMap } from "yaml";
import { describe, expect, it } from "vitest";
import { keepDate, readStartDate } from "./scrape-shared.ts";

function rootOf(yamlText: string): YAMLMap {
  return parseDocument(yamlText).contents as YAMLMap;
}

describe("readStartDate", () => {
  it("returns undefined when shows.yaml has no startDate", () => {
    expect(readStartDate(rootOf(`a-show:\n  rating: 1\n`))).toBeUndefined();
  });

  it("reads a numeric startDate", () => {
    expect(readStartDate(rootOf(`startDate: 28\n`))).toBe(28);
  });

  it("throws for a non-numeric startDate", () => {
    expect(() => readStartDate(rootOf(`startDate: today\n`))).toThrow(
      '"startDate" should be a day-of-month number',
    );
  });
});

describe("keepDate", () => {
  it("keeps every date when startDate is undefined", () => {
    expect(keepDate(1, undefined, undefined)).toBe(true);
  });

  it("keeps dates on or after startDate", () => {
    expect(keepDate(28, 28, undefined)).toBe(true);
    expect(keepDate(29, 28, undefined)).toBe(true);
  });

  it("drops dates before startDate", () => {
    expect(keepDate(27, 28, undefined)).toBe(false);
  });

  it("always keeps the booked date, even before startDate", () => {
    expect(keepDate(20, 28, 20)).toBe(true);
  });
});
