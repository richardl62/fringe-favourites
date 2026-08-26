// Syncs each show's raw fields (title/venue/duration/startTime/url) from
// public/my_fringe_favourites.csv - edfringe.com's export of the user's
// favourited shows - into public/shows.yaml, in place, preserving
// everything else in the file (comments, other fields, formatting).
// shows.yaml is the app's only source of show data; this is what keeps its
// raw fields in sync with the CSV, rather than the app reading the CSV
// itself.
//
// Run with: npm run sync-csv
//
// A show already in shows.yaml with a matching edfringe.com "url" (synced
// here before, or scraped by fetch-dates.ts before this script existed)
// has its raw fields overwritten wholesale on every run - don't hand-edit
// them for a CSV-sourced show, your edit will be overwritten next run. A
// show dropped from a future CSV export is never deleted: its raw fields
// are left as they are, and a "# PROBLEM: ..." comment is added above its
// entry instead - grep for "PROBLEM" to find them, or see them on the
// #problems page. Free-fringe and other hand-written raw-fields entries
// (anything whose "url" isn't an edfringe.com show page - e.g.
// angels-in-america, an Edinburgh International Festival show) are never
// touched by this script.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isScalar, parseDocument, YAMLMap, type Pair } from "yaml";
import { idFromUrl, parseFringeCsv } from "../src/data/fringe-csv.ts";
import { extractProblemComment } from "../src/data/problem-comment.ts";
import type { Problem } from "../src/data/problems.ts";
import type { RawShow } from "../src/data/types.ts";
import { describeYamlError } from "../src/data/yaml-errors.ts";
import {
  findOrCreateEntry,
  formatDuration,
  idsFromText,
  updateProblemComment,
} from "./scrape-shared.ts";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const SHOWS_YAML_PATH = `${REPO_ROOT}public/shows.yaml`;
const CSV_PATH = `${REPO_ROOT}public/my_fringe_favourites.csv`;

const REMOVED_MESSAGE =
  "no longer in my_fringe_favourites.csv - raw fields left as they are; delete this entry by hand if you no longer want it";

// Field write order, so a brand-new entry already comes out in the
// canonical shape tidy-shows.ts otherwise has to fix up: "title" first,
// then "duration"/"venue"/"url" last, in that order.
export function applyRawFields(entry: YAMLMap, show: RawShow): void {
  entry.set("title", show.title);
  // No "startTime" at all means the show's start time varies by
  // performance (see shows.ts's parseRawShow) - there's no sentinel value
  // for that, so a variable-time show just omits the field entirely.
  if (show.startTime === null) {
    entry.delete("startTime");
  } else {
    entry.set("startTime", show.startTime);
  }
  entry.set("duration", formatDuration(show.durationMinutes));
  entry.set("venue", show.venue);
  entry.set("url", show.url);
}

/** Clears this script's own "removed" flag if that's what's currently
 * there, but leaves any other "# PROBLEM: ..." comment (e.g. one written by
 * fetch-dates.ts) untouched - syncing a show's raw fields isn't evidence
 * that an unrelated scraping problem has gone away. */
export function clearRemovedFlagIfPresent(pair: Pair): void {
  const key = pair.key;
  if (!isScalar(key) || typeof key.commentBefore !== "string") {
    return;
  }
  if (extractProblemComment(key.commentBefore) === REMOVED_MESSAGE) {
    updateProblemComment(pair, []);
  }
}

/** A shows.yaml entry is CSV-owned if its "url" is an edfringe.com show
 * page whose id round-trips back to the entry's own key - true for every
 * entry this script itself writes, and false for a hand-written raw-fields
 * entry pointing elsewhere (e.g. a free-fringe listing, or a show from
 * another festival). */
export function isCsvOwnedEntry(id: string, url: unknown): boolean {
  if (typeof url !== "string") {
    return false;
  }
  try {
    return idFromUrl(url) === id;
  } catch {
    return false;
  }
}

/** ids of shows.yaml entries that were CSV-owned but are missing from this
 * run's CSV - i.e. unfavourited on edfringe.com since the last sync. */
export function findRemovedCsvShows(
  entries: { id: string; url: unknown }[],
  currentCsvIds: ReadonlySet<string>,
): string[] {
  return entries
    .filter((e) => isCsvOwnedEntry(e.id, e.url) && !currentCsvIds.has(e.id))
    .map((e) => e.id);
}

function main(): void {
  const originalYamlText = readFileSync(SHOWS_YAML_PATH, "utf8");
  const csvText = readFileSync(CSV_PATH, "utf8");
  const doc = parseDocument(originalYamlText);
  if (doc.errors.length > 0) {
    const descriptions = doc.errors.map((err) =>
      describeYamlError(err, originalYamlText),
    );
    throw new Error(`shows.yaml: ${descriptions.join("; ")}`);
  }

  const root = doc.contents;
  if (!(root instanceof YAMLMap)) {
    throw new Error("shows.yaml doesn't have a top-level mapping");
  }

  const rowProblems: Problem[] = [];
  const csvShows = parseFringeCsv(csvText, rowProblems);
  for (const problem of rowProblems) {
    console.error(`✗ ${problem.message}`);
  }

  for (const show of csvShows) {
    const { pair, entry } = findOrCreateEntry(doc, root, show.id);
    applyRawFields(entry, show);
    clearRemovedFlagIfPresent(pair);
  }

  // Broad id scan (not just successfully-parsed rows), so one malformed CSV
  // row elsewhere doesn't make an otherwise-still-present show look removed.
  const currentCsvIds = idsFromText(csvText);
  const entries = root.items
    .filter((item) => item.value instanceof YAMLMap)
    .map((item) => ({
      id: String(item.key),
      url: (item.value as YAMLMap).get("url"),
    }));
  const removedIds = findRemovedCsvShows(entries, currentCsvIds);
  for (const id of removedIds) {
    const { pair } = findOrCreateEntry(doc, root, id);
    updateProblemComment(pair, [REMOVED_MESSAGE]);
  }

  const newYamlText = doc.toString({
    flowCollectionPadding: false,
    lineWidth: 0,
  });
  const changed = newYamlText !== originalYamlText;
  if (changed) {
    writeFileSync(SHOWS_YAML_PATH, newYamlText);
  }

  console.log(
    `${String(csvShows.length)} show(s) synced from the CSV, ${String(removedIds.length)} flagged as removed, ${String(rowProblems.length)} row problem(s). shows.yaml ${changed ? "updated" : "unchanged"}.`,
  );
}

// Only run main() when this file is executed directly (`node
// scripts/sync-csv.ts`), not when sync-csv.test.ts imports its exported
// pure functions - otherwise importing it for testing would read/write the
// real shows.yaml/CSV as a side effect.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
