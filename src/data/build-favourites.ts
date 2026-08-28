import { multiplePerformances, unrated, warn, type Problem } from "./problems";
import type { ShowNotes } from "./shows";
import {
  unknownDate,
  type DatesT,
  type PerformanceTime,
  type RawShow,
  type Show,
  type TimesT,
} from "./types";
import { showsYamlEditLink } from "./vscode-link";

/** Combine each show's raw details with its hand-written notes, reporting
 * anything missing or inconsistent along the way. */
export function buildFavourites(
  rawShows: RawShow[],
  notesById: Map<string, ShowNotes>,
  entryLines: Map<string, number>,
  lineCount: number,
  problems: Problem[],
  startDate?: number,
): Show[] {
  const consumedIds = new Set<string>();
  const shows: Show[] = [];

  for (const raw of rawShows) {
    const notes = notesById.get(raw.id);
    consumedIds.add(raw.id);

    const link = { title: raw.title, url: raw.url };
    const editLine = entryLines.get(raw.id) ?? lineCount;
    const editLink = showsYamlEditLink(editLine);

    const isUnrated = notes?.rating === undefined;
    // A show with no shows.yaml entry at all is already reported by
    // resolveDatesAndBooking's "has no entry in shows.yaml" warning below -
    // reporting it as unrated too would just be a second warning for the
    // same underlying gap. A booked show doesn't need a rating either - it's
    // already going ahead regardless.
    if (isUnrated && notes !== undefined && notes.booked === undefined) {
      problems.push(unrated(link, editLink));
    }

    const { dates, booked } = resolveDatesAndBooking(
      raw,
      notes,
      editLink,
      problems,
      startDate,
    );
    const times = resolveTimes(raw, notes, editLink, dates, problems, startDate);
    const noAvailability = resolveNoAvailability(
      raw,
      notes,
      editLink,
      dates,
      problems,
    );

    shows.push({
      id: raw.id,
      title: raw.title,
      venue: raw.venue,
      url: raw.url,
      durationMinutes: raw.durationMinutes,
      dates,
      rating: notes?.rating ?? 0,
      unrated: isUnrated,
      booked,
      times,
      noAvailability,
    });
  }

  for (const id of notesById.keys()) {
    if (!consumedIds.has(id)) {
      problems.push(
        warn(
          `shows.yaml entry "${id}" has notes but no raw show details (title/venue/etc.) - run the appropriate sync script or add them by hand`,
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
  startDate: number | undefined,
): { dates: DatesT; booked: boolean } {
  const link = { title: raw.title, url: raw.url };

  if (notes?.booked !== undefined) {
    // A booked date before shows.yaml's own "startDate" is expected to be
    // missing from "dates": a sync script always keeps an already-recorded
    // booked date there (see scrape-shared.ts's readStartDate/keepDate),
    // but can't add one back once the date's performance has dropped out
    // of what it scrapes at all, which is normal once it's well in the past.
    const bookedIsPastStartDate =
      startDate !== undefined && notes.booked < startDate;
    if (
      notes.dates !== undefined &&
      !notes.dates.includes(notes.booked) &&
      !bookedIsPastStartDate
    ) {
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

  const message =
    notes === undefined ? `has no entry in shows.yaml` : `has no "dates" in shows.yaml`;
  problems.push(warn(message, link, editLink));
  return { dates: unknownDate, booked: false };
}

// Record indexing isn't tracked as possibly-undefined by the project's
// tsconfig, but a given date genuinely might have no "times" entry at all -
// routing the lookup through a function with an explicit "| undefined"
// return type keeps that honest (an inline-annotated local gets narrowed
// straight back to the non-optional type by TS's control-flow analysis).
function getPerformance(
  times: Record<number, PerformanceTime>,
  date: number,
): PerformanceTime | undefined {
  return times[date];
}

/** When a booked date has more than one performance (its "times" entry is
 * "double" or "many"), "bookedTime" says which one was actually booked -
 * this resolves that date down to a single performance so the page shows
 * just the one that was booked, not every possibility. Any mismatch
 * between "bookedTime" and what was actually scraped/recorded for that
 * date is reported rather than silently guessed at. */
function applyBookedTime(
  times: Record<number, PerformanceTime>,
  notes: ShowNotes,
  bookedDate: number,
  link: { title: string; url: string },
  editLink: string | undefined,
  problems: Problem[],
): Record<number, PerformanceTime> {
  const performance = getPerformance(times, bookedDate);
  const bookedTime = notes.bookedTime;

  if (bookedTime === undefined) {
    if (performance?.kind === "double" || performance?.kind === "many") {
      problems.push(
        warn(
          `is booked for a date with more than one performance but doesn't say which one - add "bookedTime" in shows.yaml`,
          link,
          editLink,
        ),
      );
    }
    return times;
  }

  if (performance === undefined) {
    problems.push(
      warn(
        `has "bookedTime" but no recorded start time for its booked date`,
        link,
        editLink,
      ),
    );
    return times;
  }

  if (performance.kind === "single") {
    if (performance.time !== bookedTime) {
      problems.push(
        warn(
          `has "bookedTime" "${bookedTime}" that doesn't match its booked date's only recorded start time "${performance.time}"`,
          link,
          editLink,
        ),
      );
    }
    return times;
  }

  if (performance.kind === "double" && !performance.times.includes(bookedTime)) {
    problems.push(
      warn(
        `has "bookedTime" "${bookedTime}" that doesn't match either of its booked date's performance times (${performance.times.join(", ")})`,
        link,
        editLink,
      ),
    );
    return times;
  }

  // performance.kind is "double" (and bookedTime matches one of its two
  // times) or "many" (trusted as given - "many" doesn't record individual
  // times to check bookedTime against).
  return { ...times, [bookedDate]: { kind: "single", time: bookedTime } };
}

function resolveTimes(
  raw: RawShow,
  notes: ShowNotes | undefined,
  editLink: string | undefined,
  dates: DatesT,
  problems: Problem[],
  startDate: number | undefined,
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

  let times = notes?.times ?? {};
  if (notes?.booked !== undefined) {
    times = applyBookedTime(times, notes, notes.booked, link, editLink, problems);
  }
  const knownDates = dates === unknownDate ? [] : dates;
  const overrideDates = Object.keys(times).map(Number);

  // Booking collapses "dates" down to just the booked day (see
  // resolveDatesAndBooking), so every other date's override is expected to
  // look "stale" here - it's leftover reference info, not a mistake.
  if (notes?.booked === undefined) {
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
  }

  // A date recorded as "many" has three or more performances - too many for
  // `times` to hold a specific time for, so that's reported separately from
  // (and doesn't count as) a genuinely missing override.
  const manyDates = knownDates.filter(
    (d) => overrideDates.includes(d) && times[d].kind === "many",
  );
  if (manyDates.length > 0) {
    problems.push(multiplePerformances(manyDates, link, editLink));
  }

  // A date before shows.yaml's own "startDate" is expected to have no
  // recorded time either, for the same reason it's expected to be missing
  // from "dates" - see resolveDatesAndBooking's bookedIsPastStartDate.
  const missingOverrides = knownDates.filter(
    (d) => !overrideDates.includes(d) && (startDate === undefined || d >= startDate),
  );
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

function resolveNoAvailability(
  raw: RawShow,
  notes: ShowNotes | undefined,
  editLink: string | undefined,
  dates: DatesT,
  problems: Problem[],
): number[] {
  const link = { title: raw.title, url: raw.url };
  const noAvailability = notes?.noAvailability ?? [];
  const knownDates = dates === unknownDate ? [] : dates;

  // Same "booking collapses dates, so leftover entries look stale" reasoning
  // as resolveTimes's staleOverrides check.
  if (notes?.booked === undefined) {
    const stale = noAvailability.filter((d) => !knownDates.includes(d));
    if (stale.length > 0) {
      problems.push(
        warn(
          `has a "no availability" entry for date(s) ${stale.join(", ")} not in its dates list`,
          link,
          editLink,
        ),
      );
    }
  }

  return noAvailability;
}
