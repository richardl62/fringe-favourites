import React, { useEffect } from 'react';
import styled from "styled-components";
import { sortAndFilterFavourites } from './sort-and-filter-favourites';
import { ShowInfoList } from './show-info-list';
import { getFavourites } from './get-favourites';

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
  const [startDate, setStartDate] = React.useState("");

  useEffect(() => {
    document.title = 'Fringe Shows';
  });
  
  useEffect(() => {
    const today = new Date();
    setStartDate(today.getDate().toString())
  },[]);



  let parsedStartDate : number | null = parseInt(startDate);
  if (isNaN(parsedStartDate)) {
    parsedStartDate = null;
  }
  
  const allFavourites = getFavourites(parsedStartDate);
  
  const favourites = sortAndFilterFavourites({
    allFavourites,
    startDate: parsedStartDate,
    sortByRating,
  });

  return <OuterDiv>
    <Inputs>
      <label>
        {"Date "}
        <input type="number" value={startDate} min={1} max={31}
          onChange={(event) => setStartDate(event.target.value)}
        />
      </label>

      <label>
        {"Sort by rating "}
        <input type="checkbox" checked={sortByRating}
          onChange={() => setSortByRating(!sortByRating)}
        />
      </label>

    </Inputs>
    <ShowInfoList showInfo={favourites} startDate={parsedStartDate} />
  </OuterDiv>;
}

export default App;
