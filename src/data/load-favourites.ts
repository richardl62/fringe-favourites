import { buildFavourites } from "./build-favourites";
import { warn, type Problem } from "./problems";
import { scotsmanReviewProblems } from "./scotsman-reviews";
import { parseShows } from "./shows";
import type { Show } from "./types";
import { showsYamlPathWarning } from "./vscode-link";

export interface LoadResult {
  shows: Show[];
  problems: Problem[];
}

async function fetchText(fileName: string): Promise<string> {
  const url = `${import.meta.env.BASE_URL}${fileName}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Could not load ${fileName} (${String(response.status)} ${response.statusText})`,
    );
  }
  return response.text();
}

/** Unlike shows.yaml, scotsman-fringe-reviews.yaml is purely supplementary
 * (it only ever produces "unconsidered" problems) - so a failure to load it
 * is reported as a problem rather than aborting the whole page. */
async function fetchOptionalText(
  fileName: string,
): Promise<{ text: string } | { errorMessage: string }> {
  try {
    return { text: await fetchText(fileName) };
  } catch (err) {
    return {
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function loadFavourites(): Promise<LoadResult> {
  const [showsText, scotsmanReviewsFetch] = await Promise.all([
    fetchText("shows.yaml"),
    fetchOptionalText("scotsman-fringe-reviews.yaml"),
  ]);

  const problems: Problem[] = [];
  const pathWarning = showsYamlPathWarning();
  if (pathWarning) {
    problems.push(pathWarning);
  }

  if ("text" in scotsmanReviewsFetch) {
    problems.push(...scotsmanReviewProblems(scotsmanReviewsFetch.text));
  } else {
    problems.push(
      warn(
        `Could not load scotsman-fringe-reviews.yaml: ${scotsmanReviewsFetch.errorMessage}`,
      ),
    );
  }

  const { rawShows, notesById, entryLines, lineCount } = parseShows(
    showsText,
    problems,
  );

  const shows = buildFavourites(
    rawShows,
    notesById,
    entryLines,
    lineCount,
    problems,
  );

  return { shows, problems };
}
