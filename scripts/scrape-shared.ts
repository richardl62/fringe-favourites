// Shared helpers for scripts/fetch-dates.ts and scripts/fetch-free-fringe.ts:
// polite-scraping basics, and editing a shows.yaml entry (including its
// "# PROBLEM: ..." comment) while preserving everything else in the file.

import { isScalar, YAMLMap, type Document, type Pair } from "yaml";

export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36";
export const REQUEST_DELAY_MS = 400;
export const PROBLEM_PREFIX = "PROBLEM: ";

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
