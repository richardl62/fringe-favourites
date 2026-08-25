// Shared helpers for scripts/fetch-dates.ts, scripts/fetch-free-fringe.ts,
// and scripts/sync-csv.ts: polite-scraping basics, id-scanning, and editing
// a shows.yaml entry (including its "# PROBLEM: ..." comment) while
// preserving everything else in the file.

import { isScalar, YAMLMap, type Document, type Pair } from "yaml";
import { PROBLEM_PREFIX } from "../src/data/problem-comment.ts";

export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36";
export const REQUEST_DELAY_MS = 400;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const WHATS_ON_URL =
  /https:\/\/www\.edfringe\.com\/tickets\/whats-on\/([^/?#"'\s]+)/g;

/** Every edfringe.com show id found anywhere in a blob of text (a CSV
 * export, or a single URL) - a broad, unanchored scan rather than a strict
 * parse, so it still finds ids even around text this script doesn't
 * otherwise understand. */
export function idsFromText(text: string): Set<string> {
  const ids = new Set<string>();
  for (const match of text.matchAll(WHATS_ON_URL)) {
    ids.add(match[1]);
  }
  return ids;
}

/** "H:MM", the inverse of shows.ts's parseHoursMinutes. */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours)}:${String(mins).padStart(2, "0")}`;
}

/** In --quick mode, a show that already has a "dates" field is assumed to
 * still be accurate and is skipped, leaving only shows that have never been
 * scraped at all. */
export function hasExistingDates(doc: Document, id: string): boolean {
  return doc.getIn([id, "dates"]) !== undefined;
}

export function findOrCreateEntry(
  doc: Document,
  root: YAMLMap,
  id: string,
): { pair: Pair; entry: YAMLMap } {
  const existing = root.items.find((item) => String(item.key) === id);
  if (existing) {
    if (!(existing.value instanceof YAMLMap)) {
      throw new Error(`shows.yaml entry "${id}" isn't a mapping`);
    }
    return { pair: existing, entry: existing.value };
  }

  const entry = new YAMLMap();
  const pair = doc.createPair(id, entry);
  pair.key.spaceBefore = true;
  root.items.push(pair);
  return { pair, entry };
}

/** A show's entry may already have a hand-written comment above it (e.g. a
 * freestanding note that happens to sit right before that entry in the
 * file). Comments are treated as blank-line-separated paragraphs, and only
 * the *last* paragraph is ever touched by this script: it's replaced with
 * a "PROBLEM: ..." paragraph when there's a problem, removed when there
 * isn't, and any earlier paragraphs are always preserved untouched. */
export function updateProblemComment(pair: Pair, problems: string[]): void {
  const key = pair.key;
  if (!isScalar(key)) {
    return; // ids are always plain scalar keys
  }

  const existing =
    typeof key.commentBefore === "string" ? key.commentBefore : "";
  const paragraphs =
    existing.trim().length > 0
      ? existing.replace(/\n+$/, "").split(/\n\s*\n/)
      : [];
  const lastIsOwnedProblem =
    paragraphs.length > 0 &&
    paragraphs[paragraphs.length - 1].trimStart().startsWith(PROBLEM_PREFIX);
  const preserved = lastIsOwnedProblem ? paragraphs.slice(0, -1) : paragraphs;

  const updated =
    problems.length > 0
      ? [...preserved, ` ${PROBLEM_PREFIX}${problems.join("; ")}`]
      : preserved;

  key.commentBefore = updated.length > 0 ? updated.join("\n\n") : undefined;
}
