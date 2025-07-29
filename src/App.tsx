import React, { useEffect } from 'react';
import styled from "styled-components";
import { sortFavourites } from './sort-favourites';
import { ShowInfoList } from './show-info-list';
import { getFavourites } from './get-favourites';
import { addNextPerformance } from './add-next-performance';

const OuterDiv = styled.div`
  display: inline-block;
`

const Inputs = styled.div`
  display: flex;
  justify-content: end; 

  label {
    margin-left: 1em;
  }
`;

function App() {
  const [sortByRating, setSortByRating] = React.useState(false);
  const [rawStartDate, setRawStartDate] = React.useState("");

  useEffect(() => {
    document.title = 'Fringe Shows';
  });
  
  useEffect(() => {
    const today = new Date();
    setRawStartDate(today.getDate().toString())
  },[]);

  let startDate : number | null = parseInt(rawStartDate);
  if (isNaN(startDate)) {
    startDate = null;
  }
  
  const importedFavourites = getFavourites(startDate);
  const extendedFavourites = addNextPerformance(importedFavourites, startDate);
  
  sortFavourites({
    favourites: extendedFavourites,
    sortByRating,
    sortByDate: startDate !== null
  });

  return <OuterDiv>
    <Inputs>
      <label>
        {"Date "}
        <input type="number" value={rawStartDate} min={1} max={31}
          onChange={(event) => setRawStartDate(event.target.value)}
        />
      </label>

      <label>
        {"Sort by rating "}
        <input type="checkbox" checked={sortByRating}
          onChange={() => setSortByRating(!sortByRating)}
        />
      </label>

    </Inputs>
    <ShowInfoList showInfo={extendedFavourites} startDate={startDate} />
  </OuterDiv>;
}

export default App;
