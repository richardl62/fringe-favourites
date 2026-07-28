import { warn, type Problem } from "./problems";
import type { ShowNotes } from "./show-notes";
import {
  unknownDate,
  type DatesT,
  type RawShow,
  type Show,
  type TimesT,
} from "./types";

/** Combine shows from their source (CSV/extra-shows) with their hand-written
 * notes, reporting anything missing or inconsistent along the way. */
export function buildFavourites(
  rawShows: RawShow[],
  notesById: Map<string, ShowNotes>,
  problems: Problem[],
): Show[] {
  const consumedIds = new Set<string>();
  const shows: Show[] = [];

  for (const raw of rawShows) {
    const notes = notesById.get(raw.id);
    consumedIds.add(raw.id);

    const link = { title: raw.title, url: raw.url };

    if (!notes) {
      problems.push(
        warn(`has no entry in show-notes.yaml (needs rating/dates)`, link),
      );
    } else if (notes.rating === undefined) {
      problems.push(warn(`has no "rating" in show-notes.yaml`, link));
    }

    const { dates, booked } = resolveDatesAndBooking(raw, notes, problems);
    const times = resolveTimes(raw, notes, dates, problems);

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
          `show-notes.yaml has an entry for "${id}" that doesn't match any current show (stale?)`,
        ),
      );
    }
  }

  return shows;
}

function resolveDatesAndBooking(
  raw: RawShow,
  notes: ShowNotes | undefined,
  problems: Problem[],
): { dates: DatesT; booked: boolean } {
  const link = { title: raw.title, url: raw.url };

  if (notes?.booked !== undefined) {
    if (notes.dates !== undefined) {
      problems.push(
        warn(
          `has both "booked" and "dates" in show-notes.yaml; using the booked date only`,
          link,
        ),
      );
    }
    return { dates: [notes.booked], booked: true };
  }

  if (notes?.dates !== undefined) {
    return { dates: notes.dates, booked: false };
  }

  if (notes) {
    problems.push(warn(`has no "dates" in show-notes.yaml`, link));
  }
  return { dates: unknownDate, booked: false };
}

function resolveTimes(
  raw: RawShow,
  notes: ShowNotes | undefined,
  dates: DatesT,
  problems: Problem[],
): TimesT {
  const link = { title: raw.title, url: raw.url };

  if (raw.startTime !== null) {
    if (notes?.times) {
      problems.push(
        warn(
          `has start-time overrides in show-notes.yaml but has a single fixed start time; ignoring them`,
          link,
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
      ),
    );
  }

  const missingOverrides = knownDates.filter((d) => !overrideDates.includes(d));
  if (missingOverrides.length > 0) {
    problems.push(
      warn(
        `has variable start times but no specific time recorded for date(s) ${missingOverrides.join(", ")}`,
        link,
      ),
    );
  }

  return times;
}
