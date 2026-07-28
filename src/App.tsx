import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { sortFavourites } from "./sort-favourites";
import { ShowInfoList } from "./show-info-list";
import { getFavourites } from "./get-favourites";
import { addNextPerformance } from "./add-next-performance";
import { loadFavourites } from "./data/load-favourites";
import type { Show } from "./data/types";
import type { Problem } from "./data/problems";
import { ProblemsView } from "./problems-view";
import { useHashRoute } from "./use-hash-route";

const OuterDiv = styled.div`
  display: inline-block;
`;

const Inputs = styled.div`
  display: flex;
  justify-content: end;
  align-items: baseline;

  label {
    margin-left: 1em;
  }
`;

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "loaded"; shows: Show[]; problems: Problem[] };

function App() {
  const [sortByRating, setSortByRating] = React.useState(false);
  const [rawStartDate, setRawStartDate] = React.useState(() =>
    new Date().getDate().toString(),
  );
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const route = useHashRoute();

  useEffect(() => {
    document.title = "Fringe Shows";
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadFavourites()
      .then(({ shows, problems }) => {
        if (!cancelled) {
          setLoadState({ status: "loaded", shows, problems });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadState({
            status: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const problems = loadState.status === "loaded" ? loadState.problems : [];

  if (route === "problems") {
    return <ProblemsView problems={problems} />;
  }

  if (loadState.status === "loading") {
    return <div>Loading show data...</div>;
  }

  if (loadState.status === "error") {
    return <div>Failed to load show data: {loadState.message}</div>;
  }

  let startDate: number | null = parseInt(rawStartDate);
  if (isNaN(startDate)) {
    startDate = null;
  }

  const importedFavourites = getFavourites(loadState.shows, startDate);
  const extendedFavourites = addNextPerformance(importedFavourites, startDate);

  sortFavourites({
    favourites: extendedFavourites,
    sortByRating,
    sortByDate: startDate !== null,
  });

  return (
    <OuterDiv>
      <Inputs>
        <label>
          {"Date "}
          <input
            type="number"
            value={rawStartDate}
            min={1}
            max={31}
            onChange={(event) => {
              setRawStartDate(event.target.value);
            }}
          />
        </label>

        <label>
          {"Sort by rating "}
          <input
            type="checkbox"
            checked={sortByRating}
            onChange={() => {
              setSortByRating(!sortByRating);
            }}
          />
        </label>

        <label>
          <a href="#problems">
            Problems{problems.length > 0 ? ` (${String(problems.length)})` : ""}
          </a>
        </label>
      </Inputs>
      <ShowInfoList showInfo={extendedFavourites} startDate={startDate} />
    </OuterDiv>
  );
}

export default App;
