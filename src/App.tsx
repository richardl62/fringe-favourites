import React, { useEffect } from 'react';
import styled from "styled-components";
import { favourites } from './raw-favourites';
import { DatesT, ShowInfo, StartTimeT, getShowInfo } from './get-show-info';

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
 
  function compareShowInfo(info1: ShowInfo, info2: ShowInfo, compareRatingParam: boolean) {

  const compareRatings = (rating1: string, rating2: string) => {
    return -rating1.localeCompare(rating2);
  }

  const compareDates = (d1: DatesT, d2: DatesT) => {
    if (d1 === null && d2 === null) {
      return 0;
    } else if (d1 === null) {
      return 1;
    } else if (d2 === null) {
      return -1;
    } else {
      return d1[0] - d2[0];
    }
  }

  const compareTimes = (t1: StartTimeT, t2: StartTimeT) => {

    if (t1 === null && t2 === null) {
      return 0;
    } else if (t1 === null) {
      return 1;
    } else if (t2 === null) {
      return -1;
    } else {
      return t1.localeCompare(t2);
    }
  }

  return (compareRatingParam && compareRatings(info1.rating, info2.rating)) || 
    compareDates(info1.dates, info2.dates) || 
    compareTimes(info1.startTime, info2.startTime);
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

  const compare = (info1: ShowInfo, info2: ShowInfo) =>
    compareShowInfo(info1, info2, sortByRating);

  const showInfo = favourites.map(getShowInfo).sort(compare);

  const gridElems: JSX.Element [] = [];
  
  const addElem = (elem: JSX.Element | string) =>
      gridElems.push(<Wrapper key={gridElems.length}>{elem}</Wrapper>);

  for(const info of showInfo) {
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
