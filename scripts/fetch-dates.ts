// Fetches each show's performance dates/times from edfringe.com and writes
// them into public/shows.yaml's "dates"/"times" fields, in place, preserving
// everything else in the file (comments, other fields, formatting).
//
// Run with: npm run fetch-dates
//
// How it works: edfringe.com's "DATES" tab is rendered client-side, but the
// data it's built from is already embedded in the page's initial HTML, in a
// Next.js `__NEXT_DATA__` <script> tag - so a plain fetch + JSON extraction
// is enough, no headless browser needed.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseDocument, YAMLMap, type Document } from "yaml";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const SHOWS_YAML_PATH = `${REPO_ROOT}public/shows.yaml`;
const CSV_PATH = `${REPO_ROOT}public/my_fringe_favourites.csv`;

const WHATS_ON_URL =
  /https:\/\/www\.edfringe\.com\/tickets\/whats-on\/([^/?#"'\s]+)/g;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36";
const REQUEST_DELAY_MS = 400;

function edFringeUrl(id: string): string {
  return `https://www.edfringe.com/tickets/whats-on/${id}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
function discoverShowIds(csvText: string, doc: Document): Set<string> {
  const ids = idsFromText(csvText);

  const root = doc.contents;
  if (!(root instanceof YAMLMap)) {
    throw new Error("shows.yaml doesn't have a top-level mapping");
  }
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

interface Performance {
  dateTime: string;
  cancelled: boolean;
}

function isPerformance(value: unknown): value is Performance {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.dateTime === "string" && typeof v.cancelled === "boolean";
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

async function fetchPerformances(id: string): Promise<Performance[]> {
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

  return performancesRaw.map((raw: unknown, index: number) => {
    if (!isPerformance(raw)) {
      throw new Error(
        `performance ${String(index)} on ${url} had an unexpected shape`,
      );
    }
    return raw;
  });
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
  return { day: parseInt(part("day"), 10), time: `${part("hour")}:${part("minute")}` };
}

interface Schedule {
  dates: number[];
  /** null means the time is fixed, so no "times" field is needed. */
  times: Map<number, string> | null;
}

function buildSchedule(id: string, performances: Performance[]): Schedule {
  const active = performances.filter((p) => !p.cancelled);
  if (active.length === 0) {
    throw new Error(`"${id}" has no non-cancelled performances, skipping`);
  }

  const byDay = new Map<number, string>();
  for (const performance of active) {
    const { day, time } = toLondonDayAndTime(performance.dateTime);
    const existing = byDay.get(day);
    if (existing !== undefined && existing !== time) {
      // shows.yaml's "times" can only hold one time per day - see types.ts.
      throw new Error(
        `"${id}" has performances on day ${String(day)} at both ${existing} and ${time} - can't represent two times for one day, skipping`,
      );
    }
    byDay.set(day, time);
  }

  const dates = [...byDay.keys()].sort((a, b) => a - b);
  const uniqueTimes = new Set(byDay.values());
  const times = uniqueTimes.size <= 1 ? null : byDay;
  return { dates, times };
}

// --- Apply a schedule into the YAML document -------------------------------

function applySchedule(doc: Document, id: string, schedule: Schedule): void {
  const datesNode = doc.createNode(schedule.dates);
  datesNode.flow = true;

  if (doc.hasIn([id])) {
    doc.setIn([id, "dates"], datesNode);
  } else {
    const entry = new YAMLMap();
    entry.set("dates", datesNode);
    const pair = doc.createPair(id, entry);
    pair.key.spaceBefore = true;
    (doc.contents as YAMLMap).items.push(pair);
  }

  if (schedule.times) {
    const timesMap = new YAMLMap();
    timesMap.flow = true;
    for (const [day, time] of schedule.times) {
      const value = doc.createNode(time);
      value.type = "QUOTE_DOUBLE";
      timesMap.set(day, value);
    }
    doc.setIn([id, "times"], timesMap);
  } else {
    doc.deleteIn([id, "times"]);
  }
}

// --- Main -------------------------------------------------------------------

async function main(): Promise<void> {
  const originalYamlText = readFileSync(SHOWS_YAML_PATH, "utf8");
  const csvText = readFileSync(CSV_PATH, "utf8");
  const doc = parseDocument(originalYamlText);

  const ids = [...discoverShowIds(csvText, doc)].sort();

  let errorCount = 0;
  for (const id of ids) {
    try {
      const performances = await fetchPerformances(id);
      const schedule = buildSchedule(id, performances);
      applySchedule(doc, id, schedule);
      console.log(`✓ ${id}`);
    } catch (err) {
      errorCount++;
      console.error(`✗ ${id}: ${(err as Error).message}`);
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
    `${String(ids.length - errorCount)}/${String(ids.length)} show(s) fetched. shows.yaml ${changed ? "updated" : "unchanged"}.`,
  );

  if (errorCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
