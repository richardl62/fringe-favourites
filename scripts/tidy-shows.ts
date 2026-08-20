// Tidies public/shows.yaml in place, preserving everything else in the file
// (comments, other fields, formatting):
//  - sorts entries alphabetically by id
//  - adds `rating: "?"` to any entry that doesn't have a "rating" field yet,
//    unless it's booked - a booked show doesn't need one (see the app's
//    own "don't report booked shows as unrated" behaviour)
//  - adds/updates a "# Show Title" comment on the line after each entry's
//    key, so the show's name is searchable even though entries are keyed
//    by id
//
// Run with: npm run tidy-shows

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isScalar, parseDocument, YAMLMap, type Document } from "yaml";
import { parseCsv } from "../src/data/parse-csv.ts";
import { describeYamlError } from "../src/data/yaml-errors.ts";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const SHOWS_YAML_PATH = `${REPO_ROOT}public/shows.yaml`;
const CSV_PATH = `${REPO_ROOT}public/my_fringe_favourites.csv`;

const WHATS_ON_URL = /\/whats-on\/([^/?#"'\s]+)/;

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

/** Show titles, keyed by id, from my_fringe_favourites.csv's "Show Name"
 * column - so entries that don't give their own "title" field (i.e. every
 * show sourced from the CSV) can still get a searchable title comment. */
function titlesFromCsv(csvText: string): Map<string, string> {
  const rows = parseCsv(csvText);
  const titles = new Map<string, string>();
  for (const row of rows) {
    const title = row[0];
    const url = row[row.length - 1];
    const match = WHATS_ON_URL.exec(url);
    if (title && match) {
      titles.set(match[1], title);
    }
  }
  return titles;
}

/** Adds/updates a "# Show Title" comment on the line after each entry's
 * key, so the file can be searched by show name despite being keyed by id.
 * An entry's own "title" field (for shows not in the CSV) wins over the
 * CSV; an id matching neither is left alone - there's nothing to show. */
function addTitleComments(root: YAMLMap, titleById: Map<string, string>): void {
  for (const item of root.items) {
    if (!isScalar(item.key) || !(item.value instanceof YAMLMap)) {
      continue;
    }
    const id = String(item.key);
    const ownTitle: unknown = item.value.get("title");
    const title =
      typeof ownTitle === "string" ? ownTitle : titleById.get(id);
    if (title) {
      // Own line, before the entry's fields, rather than trailing on the
      // id line - eemeli/yaml's parser reattaches a trailing comment there
      // on any later round-trip anyway (e.g. by fetch-dates.ts), so writing
      // it here from the start keeps the file stable instead of shifting
      // on every run that isn't tidy-shows.
      item.key.comment = undefined;
      item.value.commentBefore = ` ${title}`;
    }
  }
}

function main(): void {
  const originalYamlText = readFileSync(SHOWS_YAML_PATH, "utf8");
  const csvText = readFileSync(CSV_PATH, "utf8");
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
  addTitleComments(root, titlesFromCsv(csvText));
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
