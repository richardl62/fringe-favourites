// Scrapes The Scotsman's Fringe theatre review roundup article for every
// show's star rating and review link, and writes a summary to
// public/scotsman-fringe-reviews.yaml.
//
// Run with: npm run fetch-scotsman-reviews
//
// How it works:
//  1. On https://www.scotsman.com/arts-and-culture/edinburgh-festivals,
//     find the link to the roundup article - currently titled "Best
//     Edinburgh Fringe Theatre 2026: ...". This matches on the "Edinburgh
//     Fringe Theatre 2026" substring rather than an exact prefix, so a
//     minor rewording (e.g. dropping "Best") doesn't break the match.
//  2. On that article page, find the table with "Show" and "Rating &
//     Review" columns and read every row.
//
// www.scotsman.com sits behind a Cloudflare JS challenge, and the review
// table itself is a Flourish (flo.uri.sh) chart embedded in an iframe and
// rendered client-side - so a plain fetch isn't enough for either page.
// This uses a headless Playwright browser for both, and searches every
// frame on the article page (not just the top-level document) for the
// table, since which embedding technique Scotsman uses could change.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium, type Frame, type Locator, type Page } from "playwright";
import { isMap, parse, parseDocument, stringify } from "yaml";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUTPUT_PATH = `${REPO_ROOT}public/scotsman-fringe-reviews.yaml`;
const SHOWS_YAML_PATH = `${REPO_ROOT}public/shows.yaml`;

const LISTING_URL =
  "https://www.scotsman.com/arts-and-culture/edinburgh-festivals";
const LINK_TEXT = "Edinburgh Fringe Theatre 2026";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36";
const FRAME_SEARCH_TIMEOUT_MS = 20000;
const DEFAULT_CONSIDERED = "no";

interface ReviewedShow {
  title: string;
  rating: number;
  reviewUrl: string;
}

interface OutputShow {
  title: string;
  rating: number;
  considered: string;
  reviewUrl: string;
}

function isStoredShow(value: unknown): value is { title: string; considered: string } {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return typeof v.title === "string" && typeof v.considered === "string";
}

/** "considered" is a hand-edited field (defaults to "no", manually flipped
 * to "yes") that this script must never reset on a re-run - so any
 * existing output file's values are read first, keyed by title, and
 * carried over onto freshly-scraped shows with the same title. A show
 * that's new (or whose title changed) gets DEFAULT_CONSIDERED instead. */
function readExistingConsidered(path: string): Map<string, string> {
  if (!existsSync(path)) {
    return new Map();
  }
  const parsed: unknown = parse(readFileSync(path, "utf8"));
  if (!Array.isArray(parsed)) {
    return new Map();
  }
  const considered = new Map<string, string>();
  for (const entry of parsed) {
    if (isStoredShow(entry)) {
      considered.set(entry.title, entry.considered);
    }
  }
  return considered;
}

/** The same show's title often differs in punctuation between sources -
 * e.g. edfringe.com's CSV export has a trailing colon that looks like a
 * truncated subtitle ("Supposing:"), curly vs straight apostrophes show up
 * inconsistently, and The Scotsman doesn't always keep a title's "!"/"?".
 * So titles are compared with all punctuation stripped out and whitespace
 * collapsed, rather than requiring an exact match. */
function normalizeTitleForMatching(title: string): string {
  return title
    .replace(/\p{P}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Every show title already in shows.yaml, read from each entry's own
 * "title" field - good enough to spot a match without needing to replicate
 * the app's own title resolution. Falls back to a legacy "# Show Title"
 * comment (as tidy-shows.ts used to add above every entry, before "title"
 * was a real field for every show) for the rare entry that still has one
 * but no "title" field of its own - typically a broken/orphaned entry
 * where the comment is the only readable name left. */
function readShowTitles(path: string): Set<string> {
  if (!existsSync(path)) {
    return new Set();
  }
  const root = parseDocument(readFileSync(path, "utf8")).contents;
  if (!isMap(root)) {
    return new Set();
  }
  const titles = new Set<string>();
  for (const item of root.items) {
    if (!isMap(item.value)) {
      continue;
    }
    const title = item.value.get("title");
    if (typeof title === "string") {
      titles.add(normalizeTitleForMatching(title));
    } else if (typeof item.value.commentBefore === "string") {
      titles.add(normalizeTitleForMatching(item.value.commentBefore));
    }
  }
  return titles;
}

function withConsidered(
  shows: ReviewedShow[],
  existingConsidered: Map<string, string>,
  showTitles: Set<string>,
): OutputShow[] {
  return shows.map((show) => ({
    title: show.title,
    rating: show.rating,
    // Already "yes" once, or already in shows.yaml (i.e. already a
    // favourite - added there deliberately, so it counts as considered)
    // wins over the plain "no" default.
    considered:
      existingConsidered.get(show.title) === "yes" ||
      showTitles.has(normalizeTitleForMatching(show.title))
        ? "yes"
        : DEFAULT_CONSIDERED,
    reviewUrl: show.reviewUrl,
  }));
}

async function findArticleUrl(page: Page): Promise<string> {
  const link = page.locator(`a:has-text("${LINK_TEXT}")`).first();
  await link.waitFor({ timeout: FRAME_SEARCH_TIMEOUT_MS });
  const href = await link.getAttribute("href");
  if (!href) {
    throw new Error(
      `found a link with text "${LINK_TEXT}" on ${LISTING_URL}, but it has no href`,
    );
  }
  return new URL(href, page.url()).toString();
}

/** The review table isn't necessarily part of the article page's own
 * document - it's currently a Flourish chart embedded in an iframe, and
 * rendered client-side - so every frame on the page is checked, polling
 * for a while since the embed can take a moment to load. */
async function findReviewTable(page: Page): Promise<Locator> {
  const deadline = Date.now() + FRAME_SEARCH_TIMEOUT_MS;
  for (;;) {
    for (const frame of page.frames()) {
      const table = tableWithRatingColumn(frame);
      if ((await table.count()) > 0) {
        return table.first();
      }
    }
    if (Date.now() > deadline) {
      throw new Error(
        `couldn't find a table with a "Rating & Review" column on ${page.url()} (or any of its frames)`,
      );
    }
    await page.waitForTimeout(500);
  }
}

function tableWithRatingColumn(frame: Frame): Locator {
  return frame
    .locator("table")
    .filter({ has: frame.getByText("Rating & Review", { exact: true }) });
}

interface RawRow {
  title: string;
  starSrc: string | null;
  reviewUrl: string | null;
}

/** Each cell repeats its column header in a visually-hidden element (for
 * accessibility) ahead of its real content, which lives in a ".cell-body"
 * element - so that's what's read from, rather than the cell's full text. */
async function readRow(row: Locator, showCol: number, ratingCol: number): Promise<RawRow> {
  const cells = row.locator("td");
  const showBody = cells.nth(showCol).locator(".cell-body");
  const ratingBody = cells.nth(ratingCol).locator(".cell-body");

  const title = (await showBody.textContent())?.trim() ?? "";
  const starSrc = await ratingBody.locator('img[alt="stars"]').getAttribute("src");
  const reviewUrl = await ratingBody.locator("a").first().getAttribute("href");
  return { title, starSrc, reviewUrl };
}

async function readRawRows(table: Locator): Promise<RawRow[]> {
  const headers = await table.locator("thead th").allTextContents();
  const showCol = headers.findIndex((h) => h.trim() === "Show");
  const ratingCol = headers.findIndex((h) => h.trim() === "Rating & Review");
  if (showCol === -1 || ratingCol === -1) {
    throw new Error(
      `review table's headers were ${JSON.stringify(headers)} - expected "Show" and "Rating & Review" columns`,
    );
  }

  const rows = table.locator("tbody tr");
  const rowCount = await rows.count();
  const rawRows: RawRow[] = [];
  for (let i = 0; i < rowCount; i++) {
    rawRows.push(await readRow(rows.nth(i), showCol, ratingCol));
  }
  return rawRows;
}

const STAR_RATING_RE = /starrating-beta\.vercel\.app\/(\d+(?:\.\d+)?)\//;

function toReviewedShow(row: RawRow, index: number): ReviewedShow {
  if (!row.title) {
    throw new Error(`row ${String(index)}: couldn't find a show title`);
  }
  if (!row.reviewUrl) {
    throw new Error(
      `row ${String(index)} ("${row.title}"): couldn't find a review link`,
    );
  }
  const ratingMatch = row.starSrc ? STAR_RATING_RE.exec(row.starSrc) : null;
  if (!ratingMatch) {
    throw new Error(
      `row ${String(index)} ("${row.title}"): couldn't find a star rating (image src was "${row.starSrc ?? "none"}")`,
    );
  }
  return { title: row.title, rating: Number(ratingMatch[1]), reviewUrl: row.reviewUrl };
}

async function main(): Promise<void> {
  const existingConsidered = readExistingConsidered(OUTPUT_PATH);
  const showTitles = readShowTitles(SHOWS_YAML_PATH);

  const browser = await chromium.launch();
  try {
    const page = await (
      await browser.newContext({ userAgent: USER_AGENT })
    ).newPage();

    await page.goto(LISTING_URL, { waitUntil: "domcontentloaded" });
    const articleUrl = await findArticleUrl(page);

    await page.goto(articleUrl, { waitUntil: "domcontentloaded" });
    const table = await findReviewTable(page);
    const rawRows = await readRawRows(table);

    const shows = rawRows
      .map(toReviewedShow)
      .sort((a, b) => a.title.localeCompare(b.title));
    const outputShows = withConsidered(shows, existingConsidered, showTitles);

    const yamlText =
      `# Star ratings and review links for Edinburgh Fringe Theatre shows,\n` +
      `# scraped from The Scotsman's "${LINK_TEXT}" review roundup article:\n` +
      `# ${articleUrl}\n` +
      `#\n` +
      `# considered: "yes"/"no" - hand-edited, defaults to "no" for a new\n` +
      `#             show, but starts "yes" if the show's title is already in\n` +
      `#             shows.yaml (i.e. already a favourite). Otherwise left\n` +
      `#             untouched by later runs of this script.\n` +
      `#\n` +
      `# Run with: npm run fetch-scotsman-reviews\n\n` +
      stringify(outputShows);
    writeFileSync(OUTPUT_PATH, yamlText);

    console.log(`${String(outputShows.length)} show(s) written to ${OUTPUT_PATH}.`);
  } finally {
    await browser.close();
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
