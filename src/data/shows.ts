import {
  LineCounter,
  YAMLParseError,
  isMap,
  isScalar,
  parse,
  parseDocument,
} from "yaml";
import { error, type Problem } from "./problems";
import type { PerformanceTime, RawShow } from "./types";
import { showsYamlEditLink } from "./vscode-link";
import { describeYamlError } from "./yaml-errors";

export interface ShowNotes {
  rating?: number;
  dates?: number[];
  booked?: number;
  times?: Record<number, PerformanceTime>;
}

export interface ParsedShows {
  rawShows: RawShow[];
  notesById: Map<string, ShowNotes>;
  /** 1-based line number of each id's entry in shows.yaml, for ids that have
   * one - lets a problem link straight to the relevant line. */
  entryLines: Map<string, number>;
  /** Total line count of shows.yaml, for linking to the end of the file when
   * a show has no entry there yet. */
  lineCount: number;
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
    durationMinutes: parseHoursMinutes(asString(entry.duration, "duration")),
    startTime: parseRawStartTime(asString(entry.startTime, "startTime")),
  };
}

function parseDayList(value: unknown, field: string): number[] {
  if (!Array.isArray(value) || value.some((d) => typeof d !== "number")) {
    throw new Error(`"${field}" should be a list of day-of-month numbers`);
  }
  return value as number[];
}

const SINGLE_TIME_RE = /^\d{1,2}:\d{2}$/;
const DOUBLE_TIME_RE = /^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/;

/** A date's "times" entry: a single "HH:MM", two hyphen-separated "HH:MM"s
 * for a date with exactly two performances, or "many" for a date with three
 * or more (see types.ts's PerformanceTime). */
function parsePerformanceTime(raw: string, dateKey: string): PerformanceTime {
  if (raw === "many") {
    return { kind: "many" };
  }
  const doubleMatch = DOUBLE_TIME_RE.exec(raw);
  if (doubleMatch) {
    return { kind: "double", times: [doubleMatch[1], doubleMatch[2]] };
  }
  if (SINGLE_TIME_RE.test(raw)) {
    return { kind: "single", time: raw };
  }
  throw new Error(
    `"times" for date ${dateKey} should be "HH:MM", "HH:MM-HH:MM", or "many", got "${raw}"`,
  );
}

function parseTimes(value: unknown): Record<number, PerformanceTime> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(
      '"times" should be a mapping of day-of-month number to "HH:MM"',
    );
  }
  const times: Record<number, PerformanceTime> = {};
  for (const [dateKey, timeValue] of Object.entries(value)) {
    const date = Number(dateKey);
    if (!Number.isInteger(date)) {
      throw new Error(`"times" has a non-numeric date "${dateKey}"`);
    }
    if (typeof timeValue !== "string") {
      throw new Error(
        `"times" for date ${dateKey} should be "HH:MM", "HH:MM-HH:MM", or "many", got "${String(timeValue)}"`,
      );
    }
    times[date] = parsePerformanceTime(timeValue, dateKey);
  }
  return times;
}

function parseNotes(entry: Record<string, unknown>): ShowNotes {
  const notes: ShowNotes = {};

  if (entry.rating !== undefined && entry.rating !== "?") {
    if (typeof entry.rating !== "number") {
      throw new Error('"rating" should be a number or "?"');
    }
    notes.rating = entry.rating;
  }
  if (entry.dates !== undefined) {
    notes.dates = parseDayList(entry.dates, "dates");
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
  const lineCount = text.split(/\r\n|\r|\n/).length;

  let doc: unknown;
  try {
    doc = parse(text) ?? {};
    if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
      throw new Error("should contain a mapping of show id to show details");
    }
  } catch (err) {
    const line =
      err instanceof YAMLParseError ? err.linePos?.[0].line : undefined;
    problems.push(
      error(
        `shows.yaml: ${describeYamlError(err, text)}`,
        undefined,
        line !== undefined ? showsYamlEditLink(line) : undefined,
      ),
    );
    return {
      rawShows: [],
      notesById: new Map(),
      entryLines: new Map(),
      lineCount,
    };
  }

  const entryLines = findEntryLines(text);
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
        error(
          `shows.yaml entry "${id}": ${(err as Error).message}`,
          undefined,
          showsYamlEditLink(entryLines.get(id) ?? lineCount),
        ),
      );
    }
  }

  return { rawShows, notesById, entryLines, lineCount };
}

/** Find the line each top-level id's entry starts on, for linking a problem
 * straight to it. Best-effort: text has already been parsed successfully
 * above, so this is just a second, position-tracking pass over it. */
function findEntryLines(text: string): Map<string, number> {
  const entryLines = new Map<string, number>();
  const lineCounter = new LineCounter();
  const doc = parseDocument(text, { lineCounter });
  if (isMap(doc.contents)) {
    for (const pair of doc.contents.items) {
      if (isScalar(pair.key)) {
        entryLines.set(
          String(pair.key.value),
          lineCounter.linePos(pair.key.range[0]).line,
        );
      }
    }
  }
  return entryLines;
}
