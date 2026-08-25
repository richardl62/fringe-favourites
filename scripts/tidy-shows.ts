// Tidies public/shows.yaml in place, preserving everything else in the file
// (comments, other fields, formatting):
//  - sorts entries alphabetically by id
//  - adds `rating: "?"` to any entry that doesn't have a "rating" field yet,
//    unless it's booked - a booked show doesn't need one (see the app's
//    own "don't report booked shows as unrated" behaviour)
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
