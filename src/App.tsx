import React, { useEffect } from 'react';
import styled from "styled-components";
import { getSortedFavourites } from './get-sorted-favourites';
import { ShowInfoList } from './show-info-list';

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
    document.title = 'Fringe Favourites';
  });
  
  useEffect(() => {
    document.title = 'Fringe Favourites';
    const today = new Date();
    setStartDate(today.getDate().toString())
  },[]);

  const parsedStartDate = () => {
      const parsed = parseInt(startDate);
      return isNaN(parsed) ? 1 : parsed;
  }
  const favourites = getSortedFavourites({sortByRating, startDate: parsedStartDate()});

  return <OuterDiv>
    <Inputs>
      <label>
        Start date
        <input type="number" value={startDate} min={1} max={31}
          onChange={(event) => setStartDate(event.target.value)}
        />
      </label>

      <label>
        Sort by rating
        <input type="checkbox" checked={sortByRating}
          onChange={() => setSortByRating(!sortByRating)}
        />
      </label>

    </Inputs>
    <ShowInfoList showInfo={favourites} />
  </OuterDiv>;
}

export default App;
