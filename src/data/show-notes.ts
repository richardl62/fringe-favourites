import { parse } from "yaml";
import { error, type Problem } from "./problems";

export interface ShowNotes {
  rating?: number;
  dates?: number[];
  booked?: number;
  times?: Record<number, string>;
}

function parseDates(value: unknown): number[] {
  if (!Array.isArray(value) || value.some((d) => typeof d !== "number")) {
    throw new Error('"dates" should be a list of day-of-month numbers');
  }
  return value as number[];
}

function parseTimes(value: unknown): Record<number, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(
      '"times" should be a mapping of day-of-month number to "HH:MM"',
    );
  }
  const times: Record<number, string> = {};
  for (const [dateKey, timeValue] of Object.entries(value)) {
    const date = Number(dateKey);
    if (!Number.isInteger(date)) {
      throw new Error(`"times" has a non-numeric date "${dateKey}"`);
    }
    if (typeof timeValue !== "string" || !/^\d{1,2}:\d{2}$/.test(timeValue)) {
      throw new Error(
        `"times" for date ${dateKey} should be "HH:MM", got "${String(timeValue)}"`,
      );
    }
    times[date] = timeValue;
  }
  return times;
}

/** Parse show-notes.yaml: hand-written rating/dates/booking/time-override
 * info, keyed by show id. A bad entry is skipped and reported rather than
 * aborting the whole file. */
export function parseShowNotes(
  text: string,
  problems: Problem[],
): Map<string, ShowNotes> {
  const doc: unknown = parse(text) ?? {};
  if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
    throw new Error(
      "show-notes.yaml should contain a mapping of show id to notes",
    );
  }

  const notesById = new Map<string, ShowNotes>();
  for (const [id, value] of Object.entries(doc as Record<string, unknown>)) {
    try {
      if (typeof value !== "object" || value === null) {
        throw new Error("expected a mapping of fields");
      }
      const entry = value as Record<string, unknown>;
      const notes: ShowNotes = {};

      if (entry.rating !== undefined) {
        if (typeof entry.rating !== "number") {
          throw new Error('"rating" should be a number');
        }
        notes.rating = entry.rating;
      }
      if (entry.dates !== undefined) {
        notes.dates = parseDates(entry.dates);
      }
      if (entry.booked !== undefined) {
        if (typeof entry.booked !== "number") {
          throw new Error('"booked" should be a day-of-month number');
        }
        notes.booked = entry.booked;
      }
      if (entry.times !== undefined) {
        notes.times = parseTimes(entry.times);
      }

      notesById.set(id, notes);
    } catch (err) {
      problems.push(
        error(`show-notes.yaml entry "${id}": ${(err as Error).message}`),
      );
    }
  }
  return notesById;
}
