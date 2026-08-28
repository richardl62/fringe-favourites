// Fetches show details (title, venue, start time, duration, dates) from
// PBH's Free Fringe (freefringe.org.uk) for each URL listed in
// public/free-fringe-favourites.txt, and writes a full raw-fields entry
// for each into public/shows.yaml, in place, preserving everything else in
// the file (comments, other fields, formatting). These shows aren't in the
// edfringe.com CSV export, so - unlike fetch-dates.ts - this writes
// title/venue/duration/startTime/url too, not just dates.
//
// Run with: npm run fetch-free-fringe
//
// Pass --quick (npm run fetch-free-fringe -- --quick) to only scrape shows
// that don't have a "dates" field yet, skipping every show already scraped
// in a previous run - see fetch-dates.ts's --quick for the same idea.
//
// How it works: each show has its own plain server-rendered page (no
// client-side data fetching), so a plain fetch + a few targeted regexes on
// the HTML is enough - no headless browser needed. Free Fringe shows have
// no ticketing (turn up on the day), so there's no availability/booking
// data to scrape here, and a show's time is the same on every date.
//
// When a show can't be (fully) scraped, its existing entry (if any) is left
// untouched and a "# PROBLEM: ..." comment is added above it - grep for
// "PROBLEM" to find them all. The comment is cleared automatically once a
// later run scrapes the show cleanly.
//
// A date before shows.yaml's own "startDate" (if set) is left out of what's
// written, except a show's own booked date, which is always kept - see
// scrape-shared.ts's readStartDate/keepDate.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseDocument, YAMLMap, type Document } from "yaml";
import {
  findOrCreateEntry,
  formatDuration,
  hasExistingDates,
  keepDate,
  readStartDate,
  REQUEST_DELAY_MS,
  sleep,
  updateProblemComment,
  USER_AGENT,
} from "./scrape-shared.ts";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const SHOWS_YAML_PATH = `${REPO_ROOT}public/shows.yaml`;
const URLS_PATH = `${REPO_ROOT}public/free-fringe-favourites.txt`;

const SHOW_URL_RE = /\/shows\/([^/]+)\/?$/;

function idFromUrl(url: string): string {
  const match = SHOW_URL_RE.exec(url);
  if (!match) {
    throw new Error(
      `couldn't extract a show id from "${url}" - expected it to end ".../shows/<id>/"`,
    );
  }
  return match[1];
}

/** One non-blank, non-comment ("#...") line per show URL. */
function readShowUrls(text: string): string[] {
  return text
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

// --- Scrape a single show's page --------------------------------------------

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  quot: '"',
  "#039": "'",
  lt: "<",
  gt: ">",
};

/** Just enough entity decoding for what actually shows up in practice
 * (titles/venues with an ampersand, apostrophe, or an en/em dash). */
function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#\d+|[a-z]+);/gi, (whole, name: string) => {
    if (name in NAMED_ENTITIES) {
      return NAMED_ENTITIES[name];
    }
    if (name.startsWith("#")) {
      const code = Number(name.slice(1));
      if (Number.isInteger(code)) {
        return String.fromCharCode(code);
      }
    }
    return whole;
  });
}

function extract(html: string, regex: RegExp, label: string, url: string): string {
  const match = regex.exec(html);
  if (!match) {
    throw new Error(`couldn't find "${label}" on ${url}`);
  }
  return decodeHtmlEntities(match[1].trim());
}

interface ScrapedShow {
  title: string;
  venue: string;
  startTime: string;
  durationMinutes: number;
  dates: number[];
}

const TIME_RANGE_RE = /^(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})$/;

function parseTimeRange(
  raw: string,
  url: string,
): { startTime: string; durationMinutes: number } {
  const match = TIME_RANGE_RE.exec(raw);
  if (!match) {
    throw new Error(
      `"${raw}" on ${url} doesn't look like "HH:MM - HH:MM"`,
    );
  }
  const [, startHour, startMin, endHour, endMin] = match;
  const startMinutes = Number(startHour) * 60 + Number(startMin);
  let endMinutes = Number(endHour) * 60 + Number(endMin);
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60; // crosses midnight
  }
  return {
    startTime: `${startHour.padStart(2, "0")}:${startMin}`,
    durationMinutes: endMinutes - startMinutes,
  };
}

function scrapeShow(html: string, url: string): ScrapedShow {
  const title = extract(
    html,
    /<div class="col-12 single-show-title">[\s\S]*?<h1>([^<]+)<\/h1>/,
    "title",
    url,
  );
  const venue = extract(
    html,
    /<div class="show-venue show-value">\s*<a[^>]*>([^<]+)<\/a>/,
    "venue",
    url,
  );
  const timeRaw = extract(
    html,
    /<div class="show-time show-value">([^<]+)<\/div>/,
    "show time",
    url,
  );
  const datesBlock = extract(
    html,
    /<div class="show-date date-squares show-value">([\s\S]*?)<\/div>/,
    "show dates",
    url,
  );

  const { startTime, durationMinutes } = parseTimeRange(timeRaw, url);
  const dates = [...datesBlock.matchAll(/<span>(\d+)<\/span>/g)].map((m) =>
    Number(m[1]),
  );
  if (dates.length === 0) {
    throw new Error(`no dates found in the "show dates" block on ${url}`);
  }

  return { title, venue, startTime, durationMinutes, dates };
}

async function fetchShow(url: string): Promise<ScrapedShow> {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) {
    throw new Error(`HTTP ${String(response.status)} fetching ${url}`);
  }
  return scrapeShow(await response.text(), url);
}

// --- Apply a scraped show into the YAML document ----------------------------

function applyShow(
  doc: Document,
  entry: YAMLMap,
  url: string,
  scraped: ScrapedShow,
  startDate: number | undefined,
): void {
  entry.set("title", scraped.title);
  entry.set("venue", scraped.venue);
  entry.set("duration", formatDuration(scraped.durationMinutes));
  entry.set("startTime", scraped.startTime);
  entry.set("url", url);

  const bookedRaw: unknown = entry.get("booked");
  const bookedDate = typeof bookedRaw === "number" ? bookedRaw : undefined;
  const dates = scraped.dates.filter((d) => keepDate(d, startDate, bookedDate));

  const datesNode = doc.createNode(dates);
  datesNode.flow = true;
  entry.set("dates", datesNode);
}

// --- Main -------------------------------------------------------------------

async function main(): Promise<void> {
  const originalYamlText = readFileSync(SHOWS_YAML_PATH, "utf8");
  const urlsText = readFileSync(URLS_PATH, "utf8");
  const doc = parseDocument(originalYamlText);

  const root = doc.contents;
  if (!(root instanceof YAMLMap)) {
    throw new Error("shows.yaml doesn't have a top-level mapping");
  }

  const startDate = readStartDate(root);

  const quick = process.argv.includes("--quick");
  let urls = readShowUrls(urlsText);
  if (quick) {
    const stillToScrape = urls.filter((url) => {
      try {
        return !hasExistingDates(doc, idFromUrl(url));
      } catch {
        return true; // let the main loop report the bad URL properly
      }
    });
    console.log(
      `--quick: skipping ${String(urls.length - stillToScrape.length)} show(s) that already have "dates".`,
    );
    urls = stillToScrape;
  }

  let problemCount = 0;
  for (const url of urls) {
    let id: string;
    try {
      id = idFromUrl(url);
    } catch (err) {
      problemCount++;
      console.error(`✗ ${url}: ${(err as Error).message}`);
      continue;
    }

    const { pair, entry } = findOrCreateEntry(doc, root, id);
    try {
      const scraped = await fetchShow(url);
      applyShow(doc, entry, url, scraped, startDate);
      updateProblemComment(pair, []);
      console.log(`✓ ${id}`);
    } catch (err) {
      const message = (err as Error).message;
      updateProblemComment(pair, [message]);
      problemCount++;
      console.error(`✗ ${id}: ${message}`);
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
    `${String(urls.length - problemCount)}/${String(urls.length)} show(s) fetched cleanly. shows.yaml ${changed ? "updated" : "unchanged"}.`,
  );
  // Deliberately no non-zero exit code for per-show problems - see
  // fetch-dates.ts's main() for the same reasoning.
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
