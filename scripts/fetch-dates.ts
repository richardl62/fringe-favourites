// Fetches each show's performance dates/times/availability from
// edfringe.com and writes them into public/shows.yaml's
// "dates"/"times"/"noAvailability" fields, in place, preserving everything
// else in the file (comments, other fields, formatting).
//
// Run with: npm run fetch-dates
//
// Pass --quick (npm run fetch-dates -- --quick) to only scrape shows that
// don't have a "dates" field yet, skipping every show already scraped in a
// previous run. Useful once most shows are already up to date and you just
// want to pick up new additions to my_fringe_favourites.csv/shows.yaml
// quickly - it assumes edfringe.com hasn't changed anything for a show
// that's already been scraped, so re-run without --quick occasionally to
// pick up date/time changes on edfringe.com itself.
//
// How it works: edfringe.com's "DATES" tab is rendered client-side, but the
// data it's built from is already embedded in the page's initial HTML, in a
// Next.js `__NEXT_DATA__` <script> tag - so a plain fetch + JSON extraction
// is enough, no headless browser needed.
//
// When a show can't be (fully) scraped, whatever data is available is still
// written, and a "# PROBLEM: ..." comment is added directly above that show's
// entry - grep for "PROBLEM" to find them all. The comment is cleared
// automatically once a later run scrapes the show cleanly.
//
// edfringe.com's page HTML is occasionally stale (its "DATES" tab is backed
// by a separate, more current API than the embedded data this script reads).
// As a free, no-extra-scraping check for that: if a show is "booked" for a
// date that's missing from a fresh scrape - which shouldn't be possible,
// since booking only succeeds for a real performance - a "scrapingIssue"
// note is written for it (see updateScrapingIssue below), which the app
// surfaces as a warning on the #problems page.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseDocument, YAMLMap, type Document } from "yaml";
import {
  findOrCreateEntry,
  hasExistingDates,
  REQUEST_DELAY_MS,
  sleep,
  updateProblemComment,
  USER_AGENT,
} from "./scrape-shared.ts";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const SHOWS_YAML_PATH = `${REPO_ROOT}public/shows.yaml`;
const CSV_PATH = `${REPO_ROOT}public/my_fringe_favourites.csv`;

const WHATS_ON_URL =
  /https:\/\/www\.edfringe\.com\/tickets\/whats-on\/([^/?#"'\s]+)/g;

function edFringeUrl(id: string): string {
  return `https://www.edfringe.com/tickets/whats-on/${id}`;
}

// --- Discover which shows to scrape ---------------------------------------

function idsFromText(text: string): Set<string> {
  const ids = new Set<string>();
  for (const match of text.matchAll(WHATS_ON_URL)) {
    ids.add(match[1]);
  }
  return ids;
}

/** All show ids worth trying to scrape: every show in the CSV export, plus
 * any shows.yaml-only entries whose "url" also points at an edfringe.com
 * show page (entries pointing elsewhere, e.g. a free-fringe listing, are
 * left alone). */
function discoverShowIds(
  csvText: string,
  doc: Document,
  root: YAMLMap,
): Set<string> {
  const ids = idsFromText(csvText);

  for (const item of root.items) {
    const id = String(item.key);
    const url = doc.getIn([id, "url"]);
    if (url === undefined) {
      ids.add(id); // no url field means it's a CSV show per shows.yaml's own format
    } else if (typeof url === "string" && idsFromText(url).size > 0) {
      ids.add(id);
    }
  }
  return ids;
}

// --- Fetch and parse a show's __NEXT_DATA__ payload -----------------------

// edfringe.com's own date picker shows a date as "No allocation remaining"
// (a red bar under the date) when every performance that day has this
// ticketStatus - see the DATES tab of e.g.
// https://www.edfringe.com/tickets/whats-on/the-bbc-s-first-homosexual.
const NO_ALLOCATION_STATUS = "NO_ALLOCATION_CONTACT_VENUE";

interface Performance {
  dateTime: string;
  cancelled: boolean;
  ticketStatus: string;
}

function isPerformance(value: unknown): value is Performance {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.dateTime === "string" &&
    typeof v.cancelled === "boolean" &&
    typeof v.ticketStatus === "string"
  );
}

function field(obj: unknown, key: string): unknown {
  if (typeof obj !== "object" || obj === null) return undefined;
  return (obj as Record<string, unknown>)[key];
}

function getPath(obj: unknown, ...keys: string[]): unknown {
  return keys.reduce((acc: unknown, key) => field(acc, key), obj);
}

const NEXT_DATA_RE =
  /<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/s;

interface FetchedPerformances {
  performances: Performance[];
  /** Individual performance entries that had to be skipped, if any. */
  problems: string[];
}

/** Throws if the page couldn't be read at all (network/HTTP failure, or its
 * structure doesn't match what this script expects) - there's no usable data
 * to fall back on in those cases. A single malformed performance entry
 * amongst otherwise-good ones is not fatal: it's skipped and reported. */
async function fetchPerformances(id: string): Promise<FetchedPerformances> {
  const url = edFringeUrl(id);
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) {
    throw new Error(`HTTP ${String(response.status)} fetching ${url}`);
  }
  const html = await response.text();

  const match = NEXT_DATA_RE.exec(html);
  if (!match) {
    throw new Error(
      `couldn't find the __NEXT_DATA__ script tag on ${url} - edfringe.com's page structure may have changed`,
    );
  }

  let nextData: unknown;
  try {
    nextData = JSON.parse(match[1]);
  } catch (err) {
    throw new Error(
      `couldn't parse __NEXT_DATA__ JSON on ${url}: ${(err as Error).message}`,
      { cause: err },
    );
  }

  const performancesRaw = getPath(
    nextData,
    "props",
    "pageProps",
    "data",
    "event",
    "performances",
  );
  if (!Array.isArray(performancesRaw)) {
    throw new Error(
      `__NEXT_DATA__ on ${url} didn't have the expected event.performances array`,
    );
  }

  const performances: Performance[] = [];
  const problems: string[] = [];
  performancesRaw.forEach((raw: unknown, index: number) => {
    if (isPerformance(raw)) {
      performances.push(raw);
    } else {
      problems.push(
        `performance ${String(index)} had an unexpected shape and was skipped`,
      );
    }
  });

  return { performances, problems };
}

// --- Convert performances into shows.yaml's dates/times shape -------------

const LONDON_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/London",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function toLondonDayAndTime(isoUtc: string): { day: number; time: string } {
  const date = new Date(isoUtc);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`invalid performance dateTime: "${isoUtc}"`);
  }
  const parts = LONDON_TIME.formatToParts(date);
  const part = (type: string): string => {
    const found = parts.find((p) => p.type === type);
    if (!found) {
      throw new Error(`couldn't extract "${type}" formatting "${isoUtc}"`);
    }
    return found.value;
  };
  return {
    day: parseInt(part("day"), 10),
    time: `${part("hour")}:${part("minute")}`,
  };
}

interface Schedule {
  dates: number[];
  /** null means no "times" field is needed (a single fixed time covers every
   * date). Otherwise a map of day -> "HH:MM" (one performance), "HH:MM-HH:MM"
   * (two performances, both known times) or "many" (three or more - too many
   * to record specific times for). A date can be missing from it entirely
   * (shown as "varies" with no specific time - see shows.yaml's header) when
   * even a single performance's time couldn't be determined. */
  times: Map<number, string> | null;
  /** Dates where every performance has no allocation remaining. */
  noAvailability: number[];
  problems: string[];
}

/** Never throws: a show with no performances, or with performances whose
 * times can't be reconciled, still gets as complete a schedule as possible,
 * with the rest reported in `problems`. */
function buildSchedule(performances: Performance[]): Schedule {
  const active = performances.filter((p) => !p.cancelled);
  if (active.length === 0) {
    return {
      dates: [],
      times: null,
      noAvailability: [],
      problems: ["no non-cancelled performances were found"],
    };
  }

  const performancesByDay = new Map<
    number,
    { time: string; ticketStatus: string }[]
  >();
  for (const performance of active) {
    const { day, time } = toLondonDayAndTime(performance.dateTime);
    let dayPerformances = performancesByDay.get(day);
    if (!dayPerformances) {
      dayPerformances = [];
      performancesByDay.set(day, dayPerformances);
    }
    dayPerformances.push({ time, ticketStatus: performance.ticketStatus });
  }

  const problems: string[] = [];
  const byDay = new Map<number, string>();
  const singleTimes = new Set<string>();
  const noAvailability: number[] = [];
  let hasMultiplePerformanceDay = false;
  let hasManyPerformancesDay = false;
  for (const [day, dayPerformances] of performancesByDay) {
    const times = new Set(dayPerformances.map((p) => p.time));
    const sorted = [...times].sort();
    if (sorted.length === 1) {
      byDay.set(day, sorted[0]);
      singleTimes.add(sorted[0]);
    } else if (sorted.length === 2) {
      // shows.yaml's "times" can hold two hyphen-separated times per day -
      // see types.ts's PerformanceTime.
      hasMultiplePerformanceDay = true;
      byDay.set(day, sorted.join("-"));
    } else {
      hasMultiplePerformanceDay = true;
      hasManyPerformancesDay = true;
      byDay.set(day, "many");
    }

    if (dayPerformances.every((p) => p.ticketStatus === NO_ALLOCATION_STATUS)) {
      noAvailability.push(day);
    }
  }

  if (hasManyPerformancesDay) {
    problems.push("some dates have more than two performances");
  }

  const dates = [...performancesByDay.keys()].sort((a, b) => a - b);
  const times =
    !hasMultiplePerformanceDay && problems.length === 0 && singleTimes.size <= 1
      ? null
      : byDay;
  noAvailability.sort((a, b) => a - b);

  return { dates, times, noAvailability, problems };
}

// --- Scrape a single show ---------------------------------------------------

interface ScrapeOutcome {
  /** null means the page couldn't be read at all, so there's no schedule
   * data available this run - any existing dates/times/noAvailability are
   * left as they are. */
  schedule: Schedule | null;
  problems: string[];
}

async function scrapeShow(id: string): Promise<ScrapeOutcome> {
  let fetched: FetchedPerformances;
  try {
    fetched = await fetchPerformances(id);
  } catch (err) {
    return { schedule: null, problems: [(err as Error).message] };
  }

  const schedule = buildSchedule(fetched.performances);
  return {
    schedule,
    problems: [...fetched.problems, ...schedule.problems],
  };
}

// --- Apply an outcome into the YAML document -------------------------------

/** A cheap, free way to catch edfringe.com serving stale performance data
 * for a show (see the "Water Colour" incident this was added for: its page
 * HTML - what this script scrapes - was missing several performances that
 * the site's own live "Dates" tab showed, including a date that had
 * already been booked). Booking only succeeds for a real performance, so a
 * booked date missing from a *fresh* scrape is a strong signal that the
 * scrape - not the booking - is the thing that's wrong. Recorded as a
 * "scrapingIssue" note so it surfaces as a warning on the #problems page,
 * not just as a "PROBLEM:" comment only visible in shows.yaml itself. */
function updateScrapingIssue(entry: YAMLMap, dates: number[]): void {
  const booked = entry.get("booked");
  if (typeof booked === "number" && !dates.includes(booked)) {
    entry.set(
      "scrapingIssue",
      `edfringe.com's page didn't list a performance on ${String(booked)} (the booked date) when last scraped - its data for this show may be stale. Check the show's "Dates" tab on edfringe.com directly.`,
    );
  } else {
    entry.delete("scrapingIssue");
  }
}

function applyOutcome(
  doc: Document,
  root: YAMLMap,
  id: string,
  outcome: ScrapeOutcome,
): void {
  const { pair, entry } = findOrCreateEntry(doc, root, id);

  if (outcome.schedule !== null) {
    const { dates, times, noAvailability } = outcome.schedule;
    updateScrapingIssue(entry, dates);

    const datesNode = doc.createNode(dates);
    datesNode.flow = true;
    entry.set("dates", datesNode);

    if (times) {
      const timesMap = new YAMLMap();
      timesMap.flow = true;
      for (const [day, time] of times) {
        const value = doc.createNode(time);
        value.type = "QUOTE_DOUBLE";
        timesMap.set(day, value);
      }
      entry.set("times", timesMap);
    } else {
      entry.delete("times");
    }

    if (noAvailability.length > 0) {
      const noAvailabilityNode = doc.createNode(noAvailability);
      noAvailabilityNode.flow = true;
      entry.set("noAvailability", noAvailabilityNode);
    } else {
      entry.delete("noAvailability");
    }
  }

  updateProblemComment(pair, outcome.problems);
}

// --- Main -------------------------------------------------------------------

async function main(): Promise<void> {
  const originalYamlText = readFileSync(SHOWS_YAML_PATH, "utf8");
  const csvText = readFileSync(CSV_PATH, "utf8");
  const doc = parseDocument(originalYamlText);

  const root = doc.contents;
  if (!(root instanceof YAMLMap)) {
    throw new Error("shows.yaml doesn't have a top-level mapping");
  }

  const quick = process.argv.includes("--quick");
  let ids = [...discoverShowIds(csvText, doc, root)].sort();
  if (quick) {
    const skipped = ids.filter((id) => hasExistingDates(doc, id)).length;
    ids = ids.filter((id) => !hasExistingDates(doc, id));
    console.log(
      `--quick: skipping ${String(skipped)} show(s) that already have "dates".`,
    );
  }

  let problemCount = 0;
  for (const id of ids) {
    const outcome = await scrapeShow(id);
    applyOutcome(doc, root, id, outcome);
    if (outcome.problems.length > 0) {
      problemCount++;
      console.error(`✗ ${id}: ${outcome.problems.join("; ")}`);
    } else {
      console.log(`✓ ${id}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  const newYamlText = doc.toString({
    flowCollectionPadding: false,
    lineWidth: 0,
  });
  const changed = newYamlText !== originalYamlText;
  if (changed) {
    writeFileSync(SHOWS_YAML_PATH, newYamlText);
  }

  console.log("");
  console.log(
    `${String(ids.length - problemCount)}/${String(ids.length)} show(s) fetched cleanly. shows.yaml ${changed ? "updated" : "unchanged"}.`,
  );
  // Deliberately no non-zero exit code for per-show problems: they're
  // already recorded durably as "PROBLEM:" comments in shows.yaml itself,
  // and a non-zero exit here would break `update-shows`'s
  // `fetch-dates && tidy-shows` chain on the (common) case of any problem.
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
