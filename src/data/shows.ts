import { parse } from "yaml";
import { error, type Problem } from "./problems";
import type { RawShow } from "./types";
import { describeYamlError } from "./yaml-errors";

export interface ShowNotes {
  rating?: number;
  dates?: number[];
  booked?: number;
  times?: Record<number, string>;
}

export interface ParsedShows {
  rawShows: RawShow[];
  notesById: Map<string, ShowNotes>;
}

const RAW_FIELDS = ["title", "venue", "duration", "startTime", "url"];
const NOTE_FIELDS = ["rating", "dates", "booked", "times"];
const KNOWN_FIELDS = [...RAW_FIELDS, ...NOTE_FIELDS];

function checkUnknownFields(entry: Record<string, unknown>): void {
  const unknown = Object.keys(entry).filter((k) => !KNOWN_FIELDS.includes(k));
  if (unknown.length > 0) {
    throw new Error(`unknown field(s): ${unknown.join(", ")}`);
  }
}

function asString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`missing or invalid "${field}"`);
  }
  return value.trim();
}

function parseHoursMinutes(raw: string): number {
  const match = /^(\d+):(\d{2})$/.exec(raw);
  if (!match) {
    throw new Error(`"duration" should look like "1:15", got "${raw}"`);
  }
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

function parseRawStartTime(raw: string): string | null {
  if (raw.toLowerCase() === "varies") {
    return null;
  }
  if (/^\d{1,2}:\d{2}$/.test(raw)) {
    return raw;
  }
  throw new Error(`"startTime" should be "HH:MM" or "varies", got "${raw}"`);
}

function parseRawShow(id: string, entry: Record<string, unknown>): RawShow {
  return {
    id,
    title: asString(entry.title, "title"),
    venue: asString(entry.venue, "venue"),
    url: asString(entry.url, "url"),
    durationMinutes: parseHoursMinutes(
      asString(entry.duration, "duration"),
    ),
    startTime: parseRawStartTime(asString(entry.startTime, "startTime")),
  };
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

function parseNotes(entry: Record<string, unknown>): ShowNotes {
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

  return notes;
}

/** Parse shows.yaml: hand-written entries for shows not in the edfringe.com
 * CSV export (raw fields), plus hand-written notes - rating/dates/booking/
 * times - for any show. A bad entry is skipped and reported rather than
 * aborting the whole file. */
export function parseShows(text: string, problems: Problem[]): ParsedShows {
  let doc: unknown;
  try {
    doc = parse(text) ?? {};
    if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
      throw new Error("should contain a mapping of show id to show details");
    }
  } catch (err) {
    problems.push(error(`shows.yaml: ${describeYamlError(err, text)}`));
    return { rawShows: [], notesById: new Map() };
  }

  const rawShows: RawShow[] = [];
  const notesById = new Map<string, ShowNotes>();

  for (const [id, value] of Object.entries(doc as Record<string, unknown>)) {
    try {
      if (typeof value !== "object" || value === null) {
        throw new Error("expected a mapping of fields");
      }
      const entry = value as Record<string, unknown>;
      checkUnknownFields(entry);

      if (RAW_FIELDS.some((field) => entry[field] !== undefined)) {
        rawShows.push(parseRawShow(id, entry));
      }
      notesById.set(id, parseNotes(entry));
    } catch (err) {
      problems.push(
        error(`shows.yaml entry "${id}": ${(err as Error).message}`),
      );
    }
  }

  return { rawShows, notesById };
}
