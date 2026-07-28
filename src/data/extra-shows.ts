import { parse } from "yaml";
import { error, type Problem } from "./problems";
import type { RawShow } from "./types";

const KNOWN_FIELDS = ["title", "venue", "duration", "startTime", "url"];

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

function parseStartTime(raw: string): string | null {
  if (raw.toLowerCase() === "varies") {
    return null;
  }
  if (/^\d{1,2}:\d{2}$/.test(raw)) {
    return raw;
  }
  throw new Error(`"startTime" should be "HH:MM" or "varies", got "${raw}"`);
}

/** Parse extra-shows.yaml: hand-written entries for shows not in the
 * edfringe.com CSV export. A bad entry is skipped and reported rather than
 * aborting the whole file. */
export function parseExtraShows(text: string, problems: Problem[]): RawShow[] {
  const doc: unknown = parse(text) ?? {};
  if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
    throw new Error(
      "extra-shows.yaml should contain a mapping of show id to show details",
    );
  }

  const shows: RawShow[] = [];
  for (const [id, value] of Object.entries(doc as Record<string, unknown>)) {
    try {
      if (typeof value !== "object" || value === null) {
        throw new Error("expected a mapping of fields");
      }
      const entry = value as Record<string, unknown>;
      checkUnknownFields(entry);
      shows.push({
        id,
        title: asString(entry.title, "title"),
        venue: asString(entry.venue, "venue"),
        url: asString(entry.url, "url"),
        durationMinutes: parseHoursMinutes(
          asString(entry.duration, "duration"),
        ),
        startTime: parseStartTime(asString(entry.startTime, "startTime")),
      });
    } catch (err) {
      problems.push(
        error(`extra-shows.yaml entry "${id}": ${(err as Error).message}`),
      );
    }
  }
  return shows;
}
