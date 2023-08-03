import React, { useEffect } from 'react';
import styled from "styled-components";
import { DatesT, ShowInfo, StartTimeT } from './show-info';
import { getSortedFavourites } from './get-sorted-favourites';

const OuterDiv = styled.div`
  display: inline-block;
`

const ShowList = styled.div`
  display: inline-grid;
  
  background-color: lightgrey;
  border: lightgrey solid 1px;
  gap: 1px;
  grid-template-columns: minmax(auto, 24em) repeat(3, auto) auto minmax(auto, 1fr)
`;

const SortOptionDiv = styled.div`
  display: flex;
  justify-content: end; 
`;

const Date = styled.span`
    text-align: center;
`;

function Dates({dates}: {dates: DatesT}) {
  return <Date>{dates ? dates[0] : "-"}</Date>;
}



function ShowLink({showInfo}: {showInfo: ShowInfo}) {
  const {title, href} = showInfo;
  return <a href={href} target="_blank" rel="noreferrer">{title}</a>;
}

function StartTime({startTime}: {startTime: StartTimeT}) {
  return <span>{startTime || "misc"}</span>;
}
 
  

const Wrapper = styled.div`
  background-color: white;
  
  overflow: hidden;
  white-space: nowrap;

  padding-right: 4px;
`
function App() {
  useEffect(() => {
    document.title = 'Fringe Favourites';
  });
  
  const [sortByRating, setSortByRating] = React.useState(false);

  const onChangeSortByRating = () => {
      setSortByRating(!sortByRating);
  };

  const favourites = getSortedFavourites({sortByRating});

  const gridElems: JSX.Element [] = [];
  
  const addElem = (elem: JSX.Element | string) =>
      gridElems.push(<Wrapper key={gridElems.length}>{elem}</Wrapper>);

  for(const info of favourites) {
    addElem(<ShowLink showInfo={info} />);
    addElem(<StartTime startTime={info.startTime} />);
    addElem(<Dates dates={info.dates} />);
    addElem(info.duration);
    addElem(info.rating);
    addElem(info.venue);
  }

  return <OuterDiv>
    <SortOptionDiv>
      <label>
        <input
          type="checkbox"
          checked={sortByRating}
          onChange={onChangeSortByRating}
        />
        Sort by rating
      </label>
    </SortOptionDiv>
    <ShowList>{gridElems}</ShowList>
  </OuterDiv>;
}

export default App;
