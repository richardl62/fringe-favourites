// Tidies public/shows.yaml in place, preserving everything else in the file
// (comments, other fields, formatting):
//  - sorts entries alphabetically by id
//  - adds `rating: "?"` to any entry that doesn't have a "rating" field yet,
//    unless it's booked - a booked show doesn't need one (see the app's
//    own "don't report booked shows as unrated" behaviour)
//  - moves "title" to be the first field in any entry that has one -
//    sync-csv.ts appends it after existing fields for an entry that
//    already had notes, so this is what actually keeps it first
//  - removes an entry's freestanding comment when it just duplicates its
//    own "title" field (a leftover from before "title" was a real field)
//
// Run with: npm run tidy-shows

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isScalar, parseDocument, YAMLMap, type Document } from "yaml";
import { describeYamlError } from "../src/data/yaml-errors.ts";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const SHOWS_YAML_PATH = `${REPO_ROOT}public/shows.yaml`;

function addMissingRatings(doc: Document, root: YAMLMap): void {
  for (const item of root.items) {
    const id = String(item.key);
    if (!(item.value instanceof YAMLMap)) {
      throw new Error(`shows.yaml entry "${id}" isn't a mapping`);
    }
    if (!item.value.has("rating") && !item.value.has("booked")) {
      item.value.items.unshift(doc.createPair("rating", "?"));
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

function sortEntries(root: YAMLMap): void {
  root.items.sort((a, b) => String(a.key).localeCompare(String(b.key)));

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

  addMissingRatings(doc, root);
  moveTitleFirst(root);
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

main();
