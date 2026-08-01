import { unrated, warn, type Problem } from "./problems";
import type { ShowNotes } from "./shows";
import {
  unknownDate,
  type DatesT,
  type RawShow,
  type Show,
  type TimesT,
} from "./types";
import { showsYamlEditLink } from "./vscode-link";

/** Combine shows from their source (CSV/shows.yaml) with their hand-written
 * notes, reporting anything missing or inconsistent along the way. */
export function buildFavourites(
  rawShows: RawShow[],
  notesById: Map<string, ShowNotes>,
  entryLines: Map<string, number>,
  lineCount: number,
  problems: Problem[],
): Show[] {
  const consumedIds = new Set<string>();
  const shows: Show[] = [];

  for (const raw of rawShows) {
    const notes = notesById.get(raw.id);
    consumedIds.add(raw.id);

    const link = { title: raw.title, url: raw.url };
    const editLine = entryLines.get(raw.id) ?? lineCount;
    const editLink = showsYamlEditLink(editLine);

    if (notes?.rating === undefined) {
      problems.push(unrated(link, editLink));
    }

    const { dates, booked } = resolveDatesAndBooking(
      raw,
      notes,
      editLink,
      problems,
    );
    const times = resolveTimes(raw, notes, editLink, dates, problems);

    shows.push({
      id: raw.id,
      title: raw.title,
      venue: raw.venue,
      url: raw.url,
      durationMinutes: raw.durationMinutes,
      dates,
      rating: notes?.rating ?? 0,
      booked,
      times,
    });
  }

  for (const id of notesById.keys()) {
    if (!consumedIds.has(id)) {
      problems.push(
        warn(
          `shows.yaml has an entry for "${id}" that doesn't match any current show (stale?)`,
          undefined,
          showsYamlEditLink(entryLines.get(id) ?? lineCount),
        ),
      );
    }
  }

  return shows;
}

function resolveDatesAndBooking(
  raw: RawShow,
  notes: ShowNotes | undefined,
  editLink: string | undefined,
  problems: Problem[],
): { dates: DatesT; booked: boolean } {
  const link = { title: raw.title, url: raw.url };

  if (notes?.booked !== undefined) {
    if (notes.dates !== undefined && !notes.dates.includes(notes.booked)) {
      problems.push(
        warn(
          `is "booked" for a date not in its "dates" list in shows.yaml`,
          link,
          editLink,
        ),
      );
    }
    return { dates: [notes.booked], booked: true };
  }

  if (notes?.dates !== undefined) {
    return { dates: notes.dates, booked: false };
  }

  problems.push(warn(`has no "dates" in shows.yaml`, link, editLink));
  return { dates: unknownDate, booked: false };
}

function resolveTimes(
  raw: RawShow,
  notes: ShowNotes | undefined,
  editLink: string | undefined,
  dates: DatesT,
  problems: Problem[],
): TimesT {
  const link = { title: raw.title, url: raw.url };

  if (raw.startTime !== null) {
    if (notes?.times) {
      problems.push(
        warn(
          `has start-time overrides in shows.yaml but has a single fixed start time; ignoring them`,
          link,
          editLink,
        ),
      );
    }
    return raw.startTime;
  }

  const times = notes?.times ?? {};
  const knownDates = dates === unknownDate ? [] : dates;
  const overrideDates = Object.keys(times).map(Number);

  const staleOverrides = overrideDates.filter((d) => !knownDates.includes(d));
  if (staleOverrides.length > 0) {
    problems.push(
      warn(
        `has a start-time override for date(s) ${staleOverrides.join(", ")} not in its dates list`,
        link,
        editLink,
      ),
    );
  }

  const missingOverrides = knownDates.filter((d) => !overrideDates.includes(d));
  if (missingOverrides.length > 0) {
    problems.push(
      warn(
        `has variable start times but no specific time recorded for date(s) ${missingOverrides.join(", ")}`,
        link,
        editLink,
      ),
    );
  }

  return times;
}
