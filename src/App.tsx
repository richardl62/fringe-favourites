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
  const [startDate, setStartDate] = React.useState<number|undefined>();

  useEffect(() => {
    document.title = 'Fringe Favourites';
  });
  
  useEffect(() => {
    document.title = 'Fringe Favourites';
    const today = new Date();
    setStartDate(today.getDate())
  },[]);

  const favourites = getSortedFavourites({sortByRating, startDate: startDate || 1});

  const onStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseInt(event.target.value)
      setStartDate(isNaN(parsed)? undefined : parsed )
  }
  return <OuterDiv>
    <Inputs>
      <label>
        Start date
        <input type="text" pattern="[0-9]*" value={startDate} min={1} max={31}
          onChange={onStartDateChange}
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
