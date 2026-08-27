import { parseCsv } from "./parse-csv.ts";
import { error, type Problem } from "../src/data/problems.ts";
import type { RawShow } from "../src/data/types.ts";

const EXPECTED_HEADER = [
  "Show Name",
  "Genre",
  "Venue Name",
  "Space Name",
  "Wheelchair Accessible Space",
  "Enhanced Performances Available",
  "Show Start Time",
  "Performance Duration",
  "Opted into Fringe Friends",
  "Performer/Performance Company",
  "URL to Event Details",
];

export function idFromUrl(url: string): string {
  const match = /\/whats-on\/([^/?#]+)\/?$/.exec(url);
  if (!match) {
    throw new Error(
      `URL doesn't look like an edfringe.com show page: "${url}"`,
    );
  }
  return match[1];
}

function parseDuration(raw: string): number {
  const match = /^(\d+)\s*mins?$/i.exec(raw.trim());
  if (!match) {
    throw new Error(`Unrecognised "Performance Duration" value: "${raw}"`);
  }
  return parseInt(match[1], 10);
}

function parseStartTime(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^various times$/i.test(trimmed)) {
    return null;
  }
  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  throw new Error(`Unrecognised "Show Start Time" value: "${raw}"`);
}

function combineVenue(venueName: string, spaceName: string): string {
  return spaceName ? `${spaceName} at ${venueName}` : venueName;
}

/** Parse my_fringe_favourites.csv, as exported from edfringe.com. Used by
 * scripts/sync-csv.ts to import each show's raw fields into shows.yaml -
 * not read at app runtime. A row that can't be understood is skipped and
 * reported as a problem rather than aborting the whole file. */
export function parseFringeCsv(text: string, problems: Problem[]): RawShow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    throw new Error("my_fringe_favourites.csv is empty");
  }

  const [header, ...dataRows] = rows;
  const headerMatches =
    header.length === EXPECTED_HEADER.length &&
    header.every((cell, i) => cell === EXPECTED_HEADER[i]);
  if (!headerMatches) {
    throw new Error(
      "my_fringe_favourites.csv's header doesn't match the expected edfringe.com export format",
    );
  }

  const shows: RawShow[] = [];
  const seenIds = new Set<string>();

  dataRows.forEach((row, index) => {
    const rowNumber = index + 2; // +1 for the header row, +1 for 1-based numbering
    try {
      if (row.length !== EXPECTED_HEADER.length) {
        throw new Error(
          `expected ${String(EXPECTED_HEADER.length)} columns, found ${String(row.length)}`,
        );
      }
      const [title, , venueName, spaceName, , , startTime, duration, , , url] =
        row;

      if (!title.trim()) {
        throw new Error("missing show name");
      }
      if (!url.trim()) {
        throw new Error("missing URL");
      }

      const id = idFromUrl(url.trim());
      if (seenIds.has(id)) {
        throw new Error(`duplicate show (same URL as another row): ${url}`);
      }
      seenIds.add(id);

      shows.push({
        id,
        title: title.trim(),
        venue: combineVenue(venueName.trim(), spaceName.trim()),
        url: url.trim(),
        durationMinutes: parseDuration(duration),
        startTime: parseStartTime(startTime),
      });
    } catch (err) {
      problems.push(
        error(
          `Row ${String(rowNumber)} of my_fringe_favourites.csv: ${(err as Error).message}`,
        ),
      );
    }
  });

  return shows;
}
