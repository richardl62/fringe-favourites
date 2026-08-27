import {
  LineCounter,
  YAMLParseError,
  isMap,
  isSeq,
  parse,
  parseDocument,
} from "yaml";
import { error, unconsidered, type Problem } from "./problems";
import { scotsmanReviewsYamlEditLink } from "./vscode-link";
import { describeYamlError } from "./yaml-errors";

const KNOWN_FIELDS = [
  "title",
  "rating",
  "considered",
  "reviewUrl",
  "guessedShowUrl",
];

interface ParsedReview {
  title: string;
  rating: number;
  considered: boolean;
  reviewUrl: string;
  guessedShowUrl?: string;
}

function parseReview(entry: Record<string, unknown>): ParsedReview {
  const unknown = Object.keys(entry).filter((k) => !KNOWN_FIELDS.includes(k));
  if (unknown.length > 0) {
    throw new Error(`unknown field(s): ${unknown.join(", ")}`);
  }
  if (typeof entry.title !== "string" || !entry.title.trim()) {
    throw new Error('missing or invalid "title"');
  }
  if (typeof entry.rating !== "number") {
    throw new Error('missing or invalid "rating"');
  }
  if (entry.considered !== "yes" && entry.considered !== "no") {
    throw new Error('"considered" should be "yes" or "no"');
  }
  if (typeof entry.reviewUrl !== "string" || !entry.reviewUrl.trim()) {
    throw new Error('missing or invalid "reviewUrl"');
  }
  if (
    entry.guessedShowUrl !== undefined &&
    (typeof entry.guessedShowUrl !== "string" || !entry.guessedShowUrl.trim())
  ) {
    throw new Error('invalid "guessedShowUrl"');
  }
  return {
    title: entry.title.trim(),
    rating: entry.rating,
    considered: entry.considered === "yes",
    reviewUrl: entry.reviewUrl.trim(),
    guessedShowUrl: entry.guessedShowUrl?.trim(),
  };
}

/** 1-based line number each list entry starts on, in list order - for
 * linking a problem straight to it. Best-effort: text has already been
 * parsed successfully above, so this is just a second, position-tracking
 * pass over it. */
function findEntryLines(text: string): number[] {
  const lineCounter = new LineCounter();
  const doc = parseDocument(text, { lineCounter });
  if (!isSeq(doc.contents)) {
    return [];
  }
  return doc.contents.items.map((item) => {
    const start = isMap(item) ? item.range[0] : undefined;
    return start !== undefined ? lineCounter.linePos(start).line : 0;
  });
}

/** Parses scotsman-fringe-reviews.yaml and reports every show marked
 * "considered: no" as an "unconsidered" problem, so it surfaces on the
 * #problems page as something to look at. A parse error, or a single bad
 * entry, is reported the same way shows.yaml's own errors are, rather than
 * aborting the whole page - this file is hand-edited, so mistakes are
 * expected. */
export function scotsmanReviewProblems(text: string): Problem[] {
  const problems: Problem[] = [];

  let doc: unknown;
  try {
    doc = parse(text) ?? [];
    if (!Array.isArray(doc)) {
      throw new Error("should contain a list of shows");
    }
  } catch (err) {
    const line =
      err instanceof YAMLParseError ? err.linePos?.[0].line : undefined;
    problems.push(
      error(
        `scotsman-fringe-reviews.yaml: ${describeYamlError(err, text)}`,
        undefined,
        line !== undefined ? scotsmanReviewsYamlEditLink(line) : undefined,
      ),
    );
    return problems;
  }

  const entryLines = findEntryLines(text);

  doc.forEach((raw: unknown, index: number) => {
    const editLink = scotsmanReviewsYamlEditLink(entryLines[index] ?? 0);
    try {
      if (typeof raw !== "object" || raw === null) {
        throw new Error("expected a mapping of fields");
      }
      const review = parseReview(raw as Record<string, unknown>);
      if (!review.considered) {
        problems.push(
          unconsidered(
            review.rating,
            { title: review.title, url: review.reviewUrl },
            editLink,
            review.guessedShowUrl,
          ),
        );
      }
    } catch (err) {
      problems.push(
        error(
          `scotsman-fringe-reviews.yaml entry ${String(index)}: ${(err as Error).message}`,
          undefined,
          editLink,
        ),
      );
    }
  });

  return problems;
}
