import {
  LineCounter,
  YAMLParseError,
  isMap,
  isScalar,
  parse,
  parseDocument,
} from "yaml";
import { error, warn, type Problem } from "./problems";
import { extractProblemComment } from "./problem-comment";
import type { PerformanceTime, RawShow } from "./types";
import { showsYamlEditLink } from "./vscode-link";
import { describeYamlError } from "./yaml-errors";

export interface ShowNotes {
  rating?: number;
  dates?: number[];
  booked?: number;
  /** Which of a booked date's performances was booked, as "HH:MM" - only
   * meaningful (and only needed) when that date has more than one
   * performance, i.e. its "times" entry is "double" or "many". */
  bookedTime?: string;
  times?: Record<number, PerformanceTime>;
  noAvailability?: number[];
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

// Every show has RAW_FIELDS now (synced from my_fringe_favourites.csv by
// scripts/sync-csv.ts, or hand-written for a show that isn't in the CSV,
// e.g. a free-fringe listing scraped by fetch-free-fringe.ts) - don't
// hand-edit them for a CSV-sourced show, sync-csv.ts overwrites them wholesale
// on every run.
const RAW_FIELDS = ["title", "venue", "duration", "startTime", "url"];
const NOTE_FIELDS = [
  "rating",
  "dates",
  "booked",
  "bookedTime",
  "times",
  "noAvailability",
];
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
    if (typeof entry.rating !== "number" || ![0, 1, 2].includes(entry.rating)) {
      throw new Error('"rating" should be 0, 1, 2, or "?"');
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
  if (entry.bookedTime !== undefined) {
    if (typeof entry.bookedTime !== "string" || !SINGLE_TIME_RE.test(entry.bookedTime)) {
      throw new Error('"bookedTime" should be "HH:MM"');
    }
    if (notes.booked === undefined) {
      throw new Error('"bookedTime" needs "booked" to also be set');
    }
    notes.bookedTime = entry.bookedTime;
  }
  if (entry.times !== undefined) {
    notes.times = parseTimes(entry.times);
  }
  if (entry.noAvailability !== undefined) {
    notes.noAvailability = parseDayList(entry.noAvailability, "noAvailability");
  }

  return notes;
}

/** Parse shows.yaml: the single source of show data for the app - raw
 * fields (title/venue/etc., synced from the CSV export or hand-written for
 * a non-CSV show) plus hand-written notes - rating/dates/booking/times/
 * availability - for any show. A bad entry is skipped and reported rather
 * than aborting the whole file, and a "# PROBLEM: ..." comment already
 * above an entry (see scripts/scrape-shared.ts) is surfaced as a warning
 * too. */
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

  const entryMetadata = findEntryMetadata(text);
  const entryLines = new Map<string, number>();
  for (const [id, meta] of entryMetadata) {
    entryLines.set(id, meta.line);
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

      let raw: RawShow | undefined;
      if (RAW_FIELDS.some((field) => entry[field] !== undefined)) {
        raw = parseRawShow(id, entry);
        rawShows.push(raw);
      }
      notesById.set(id, parseNotes(entry));

      // A "# PROBLEM: ..." comment (written by fetch-dates.ts/
      // fetch-free-fringe.ts/sync-csv.ts when a show can't be fully
      // scraped/synced) is otherwise only visible by opening shows.yaml -
      // surface it here too, so it shows up on the #problems page.
      const problemComment = entryMetadata.get(id)?.problemComment;
      if (problemComment !== undefined) {
        problems.push(
          warn(
            `shows.yaml entry "${id}": ${problemComment}`,
            raw ? { title: raw.title, url: raw.url } : undefined,
            showsYamlEditLink(entryLines.get(id) ?? lineCount),
          ),
        );
      }
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

interface EntryMetadata {
  line: number;
  problemComment?: string;
}

/** Find the line each top-level id's entry starts on (for linking a problem
 * straight to it) and any "# PROBLEM: ..." comment already above it.
 * Best-effort: text has already been parsed successfully above, so this is
 * just a second, position-tracking pass over it. */
function findEntryMetadata(text: string): Map<string, EntryMetadata> {
  const metadata = new Map<string, EntryMetadata>();
  const lineCounter = new LineCounter();
  const doc = parseDocument(text, { lineCounter });
  if (isMap(doc.contents)) {
    for (const pair of doc.contents.items) {
      if (isScalar(pair.key)) {
        const line = lineCounter.linePos(pair.key.range[0]).line;
        const problemComment = extractProblemComment(
          typeof pair.key.commentBefore === "string"
            ? pair.key.commentBefore
            : undefined,
        );
        metadata.set(String(pair.key.value), { line, problemComment });
      }
    }
  }
  return metadata;
}
