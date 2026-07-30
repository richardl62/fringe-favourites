// Sorts public/shows.yaml's entries alphabetically by id and adds
// `rating: "?"` to any entry that doesn't have a "rating" field yet, in
// place, preserving everything else in the file (comments, other fields,
// formatting).
//
// Run with: npm run sort-shows

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isScalar, parseDocument, YAMLMap, type Document } from "yaml";

const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const SHOWS_YAML_PATH = `${REPO_ROOT}public/shows.yaml`;

function addMissingRatings(doc: Document, root: YAMLMap): void {
  for (const item of root.items) {
    const id = String(item.key);
    if (!(item.value instanceof YAMLMap)) {
      throw new Error(`shows.yaml entry "${id}" isn't a mapping`);
    }
    if (!item.value.has("rating")) {
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
