import { buildFavourites } from "./build-favourites";
import { parseFringeCsv } from "./fringe-csv";
import { error, type Problem } from "./problems";
import { parseShows } from "./shows";
import type { RawShow, Show } from "./types";

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
  problems: Problem[],
): RawShow[] {
  const shows = [...csvShows];
  const seenIds = new Set(csvShows.map((show) => show.id));

  for (const show of extraShows) {
    if (seenIds.has(show.id)) {
      problems.push(
        error(
          `shows.yaml entry "${show.id}" has the same id as a show already in my_fringe_favourites.csv; ignoring it`,
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

  const csvShows = parseFringeCsv(csvText, problems);
  const { rawShows: extraShows, notesById } = parseShows(showsText, problems);
  const rawShows = mergeRawShows(csvShows, extraShows, problems);

  const shows = buildFavourites(rawShows, notesById, problems);

  return { shows, problems };
}
