// The "# PROBLEM: ..." comment convention scripts/scrape-shared.ts writes
// above a shows.yaml entry when it can't be (fully) scraped - shared here
// so shows.ts can read the same convention back out as a Problem.

export const PROBLEM_PREFIX = "PROBLEM: ";

/** A show's entry may have a hand-written comment above it too (e.g. a
 * freestanding note that happens to sit right before that entry in the
 * file) - comments are treated as blank-line-separated paragraphs, and
 * only the *last* paragraph is ever a "PROBLEM: ..." marker (see
 * updateProblemComment in scripts/scrape-shared.ts, which writes this
 * convention). Returns just the problem text (without the prefix) if the
 * last paragraph is one, else undefined. */
export function extractProblemComment(
  commentBefore: string | undefined,
): string | undefined {
  if (typeof commentBefore !== "string") {
    return undefined;
  }
  const trimmed = commentBefore.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  const paragraphs = trimmed.replace(/\n+$/, "").split(/\n\s*\n/);
  const last = paragraphs[paragraphs.length - 1].trimStart();
  return last.startsWith(PROBLEM_PREFIX)
    ? last.slice(PROBLEM_PREFIX.length)
    : undefined;
}
