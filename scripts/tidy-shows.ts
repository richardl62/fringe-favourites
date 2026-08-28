// Tidies public/shows.yaml in place, preserving everything else in the file
// (comments, other fields, formatting):
//  - sorts entries alphabetically by id ("startDate" always stays first,
//    since it isn't a show)
//  - adds `rating: "?"` to any entry that doesn't have a "rating" field yet,
//    unless it's booked - a booked show doesn't need one (see the app's
//    own "don't report booked shows as unrated" behaviour)
//  - drops any recorded date before "startDate" (if set) from an entry's
//    "dates"/"times"/"noAvailability" - a booked date is always kept, even
//    if it's in the past - see scrape-shared.ts's readStartDate/keepDate
//  - moves "title" to be the first field in any entry that has one -
//    sync-csv.ts appends it after existing fields for an entry that
//    already had notes, so this is what actually keeps it first
//  - moves "duration", "venue", "url" (in that order) to be the last three
//    fields in any entry that has them
//  - removes an entry's freestanding comment when it just duplicates its
//    own "title" field (a leftover from before "title" was a real field)
//
// Run with: npm run tidy-shows

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isScalar, parseDocument, YAMLMap, YAMLSeq, type Document } from "yaml";
import { START_DATE_FIELD } from "../src/data/types.ts";
import { describeYamlError } from "../src/data/yaml-errors.ts";
import { keepDate, readStartDate } from "./scrape-shared.ts";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const SHOWS_YAML_PATH = `${REPO_ROOT}public/shows.yaml`;

export function addMissingRatings(doc: Document, root: YAMLMap): void {
  for (const item of root.items) {
    const id = String(item.key);
    if (id === START_DATE_FIELD) {
      continue; // not a show
    }
    if (!(item.value instanceof YAMLMap)) {
      throw new Error(`shows.yaml entry "${id}" isn't a mapping`);
    }
    if (!item.value.has("rating") && !item.value.has("booked")) {
      item.value.items.unshift(doc.createPair("rating", "?"));
    }
  }
}

/** Plain JS values of a YAMLSeq's items - YAMLMap#get only unwraps a
 * direct scalar value, so a nested collection (a "dates"/"noAvailability"
 * seq) needs unwrapping by hand. */
function seqValues(seq: YAMLSeq): unknown[] {
  return seq.items.map((item): unknown => (isScalar(item) ? item.value : item));
}

/** Drops any recorded date before "startDate" from an entry's
 * "dates"/"times"/"noAvailability" - a show's booked date is always kept,
 * even if it's in the past, since it's a record of what was actually
 * booked rather than just upcoming-schedule info. A no-op for every entry
 * when shows.yaml has no "startDate" set. */
export function pruneDatesBeforeStartDate(
  doc: Document,
  root: YAMLMap,
  startDate: number | undefined,
): void {
  if (startDate === undefined) {
    return;
  }
  for (const item of root.items) {
    if (!(item.value instanceof YAMLMap)) {
      continue;
    }
    const entry = item.value;
    const bookedRaw: unknown = entry.get("booked");
    const bookedDate = typeof bookedRaw === "number" ? bookedRaw : undefined;
    const keep = (day: number) => keepDate(day, startDate, bookedDate);

    const dates: unknown = entry.get("dates");
    if (dates instanceof YAMLSeq) {
      const values = seqValues(dates);
      const filtered = values.filter((d) => typeof d === "number" && keep(d));
      if (filtered.length !== values.length) {
        const node = doc.createNode(filtered);
        node.flow = true;
        entry.set("dates", node);
      }
    }

    const noAvailability: unknown = entry.get("noAvailability");
    if (noAvailability instanceof YAMLSeq) {
      const values = seqValues(noAvailability);
      const filtered = values.filter((d) => typeof d === "number" && keep(d));
      if (filtered.length === 0) {
        entry.delete("noAvailability");
      } else if (filtered.length !== values.length) {
        const node = doc.createNode(filtered);
        node.flow = true;
        entry.set("noAvailability", node);
      }
    }

    const times: unknown = entry.get("times");
    if (times instanceof YAMLMap) {
      const staleKeys = times.items
        .map((pair) => Number(pair.key))
        .filter((day) => !keep(day));
      for (const day of staleKeys) {
        times.delete(day);
      }
      if (times.items.length === 0) {
        entry.delete("times");
      }
    }
  }
}

/** Moves "title" to be the first field in every entry that has one. */
function moveTitleFirst(root: YAMLMap): void {
  for (const item of root.items) {
    if (!(item.value instanceof YAMLMap)) {
      continue;
    }
    const items = item.value.items;
    const titleIndex = items.findIndex((pair) => String(pair.key) === "title");
    if (titleIndex > 0) {
      const [titlePair] = items.splice(titleIndex, 1);
      items.unshift(titlePair);
    }
  }
}

// Processed in this order so each one lands after the last, leaving the
// final field order "..., duration, venue, url".
const FIELDS_LAST = ["duration", "venue", "url"];

/** Moves "duration", "venue", "url" (in that order) to be the last fields
 * in every entry that has them - an entry missing one (e.g. a show with a
 * single fixed start time recorded via "startTime" but no url) just skips
 * it. */
function moveFieldsLast(root: YAMLMap): void {
  for (const item of root.items) {
    if (!(item.value instanceof YAMLMap)) {
      continue;
    }
    const items = item.value.items;
    for (const fieldName of FIELDS_LAST) {
      const index = items.findIndex((pair) => String(pair.key) === fieldName);
      if (index === -1) {
        continue;
      }
      const [pair] = items.splice(index, 1);
      items.push(pair);
    }
  }
}

/** Removes an entry's freestanding comment when it just duplicates its own
 * "title" field. An entry with no "title" field at all is left alone - the
 * comment may be the only readable name left for a broken/orphaned entry
 * (e.g. one sync-csv.ts can no longer match up with the CSV). */
function removeRedundantTitleComment(root: YAMLMap): void {
  for (const item of root.items) {
    if (!(item.value instanceof YAMLMap)) {
      continue;
    }
    const comment = item.value.commentBefore;
    if (typeof comment !== "string") {
      continue;
    }
    const title: unknown = item.value.get("title");
    if (typeof title === "string" && comment.trim() === title.trim()) {
      item.value.commentBefore = undefined;
    }
  }
}

/** Sorts entries alphabetically by id, except "startDate" (not a show id)
 * always stays first, wherever it sorts alphabetically. */
export function sortEntries(root: YAMLMap): void {
  root.items.sort((a, b) => {
    const aKey = String(a.key);
    const bKey = String(b.key);
    if (aKey === START_DATE_FIELD) return -1;
    if (bKey === START_DATE_FIELD) return 1;
    return aKey.localeCompare(bKey);
  });

  // Every entry gets exactly one blank line before it, except the first -
  // which shouldn't have one, since a blank line already follows the file's
  // header comment.
  root.items.forEach((item, index) => {
    if (isScalar(item.key)) {
      item.key.spaceBefore = index > 0;
    }
  });
}

function main(): void {
  const originalYamlText = readFileSync(SHOWS_YAML_PATH, "utf8");
  const doc = parseDocument(originalYamlText);
  if (doc.errors.length > 0) {
    // parseDocument (unlike shows.ts's plain parse()) never throws on a bad
    // file - it collects problems into doc.errors instead, so a document
    // with any would otherwise fail opaquely later, at doc.toString(), with
    // "Document with errors cannot be stringified" and no indication of
    // what's actually wrong or where.
    const descriptions = doc.errors.map((err) => describeYamlError(err, originalYamlText));
    throw new Error(`shows.yaml: ${descriptions.join("; ")}`);
  }

  const root = doc.contents;
  if (!(root instanceof YAMLMap)) {
    throw new Error("shows.yaml doesn't have a top-level mapping");
  }

  const startDate = readStartDate(root);

  addMissingRatings(doc, root);
  pruneDatesBeforeStartDate(doc, root, startDate);
  moveTitleFirst(root);
  moveFieldsLast(root);
  removeRedundantTitleComment(root);
  sortEntries(root);

  const newYamlText = doc.toString({
    flowCollectionPadding: false,
    lineWidth: 0,
  });
  const changed = newYamlText !== originalYamlText;
  if (changed) {
    writeFileSync(SHOWS_YAML_PATH, newYamlText);
  }

  console.log(`shows.yaml ${changed ? "updated" : "unchanged"}.`);
}

// Only run main() when this file is executed directly (`node
// scripts/tidy-shows.ts`), not when tidy-shows.test.ts imports its exported
// pure functions - otherwise importing it for testing would read/write the
// real shows.yaml as a side effect.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
