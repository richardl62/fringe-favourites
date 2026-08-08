import { buildFavourites } from "./build-favourites";
import { parseFringeCsv } from "./fringe-csv";
import { error, type Problem } from "./problems";
import { parseShows } from "./shows";
import type { RawShow, Show } from "./types";
import { showsYamlEditLink, showsYamlPathWarning } from "./vscode-link";

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

function mergeRawShows(
  csvShows: RawShow[],
  extraShows: RawShow[],
  entryLines: Map<string, number>,
  problems: Problem[],
): RawShow[] {
  const shows = [...csvShows];
  const seenIds = new Set(csvShows.map((show) => show.id));

  for (const show of extraShows) {
    if (seenIds.has(show.id)) {
      const line = entryLines.get(show.id);
      problems.push(
        error(
          `shows.yaml entry "${show.id}" has the same id as a show already in my_fringe_favourites.csv; ignoring it`,
          undefined,
          line !== undefined ? showsYamlEditLink(line) : undefined,
        ),
      );
      continue;
    }
    seenIds.add(show.id);
    shows.push(show);
  }

  return shows;
}

export async function loadFavourites(): Promise<LoadResult> {
  const [csvText, showsText] = await Promise.all([
    fetchText("my_fringe_favourites.csv"),
    fetchText("shows.yaml"),
  ]);

  const problems: Problem[] = [];
  const pathWarning = showsYamlPathWarning();
  if (pathWarning) {
    problems.push(pathWarning);
  }

  const csvShows = parseFringeCsv(csvText, problems);
  const {
    rawShows: extraShows,
    notesById,
    entryLines,
    lineCount,
  } = parseShows(showsText, problems);
  const rawShows = mergeRawShows(csvShows, extraShows, entryLines, problems);

  const shows = buildFavourites(
    rawShows,
    notesById,
    entryLines,
    lineCount,
    problems,
  );

  return { shows, problems };
}
