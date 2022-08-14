import React, { useEffect } from 'react';
import styled from "styled-components";
import { favourites } from './favourites';

const ShowList = styled.div`
  * {
    overflow: hidden;
    white-space: nowrap;
  }
  display: inline-grid;
  column-gap: 2px;
  grid-template-columns: minmax(auto, 24em) repeat(3, auto) auto minmax(auto, 1fr)
`;

type StartTimeT = string | null; // null -> More than one start time is listed

function unpackVenue(venue: string) {
  // To do consider proper implemenation of camel case 
  return venue.replace("ROUNDABOUT", "Roundabout");
}

function unpackStartTime(times: string) : StartTimeT {
  if(times.includes(" ")) {
    return null;
  }

  return times;
}

type DatesT = number[] | null;
function unpackDates(dates: string) : DatesT  {
  const dateStr = dates.split(" ");
  if(dateStr[0] === "") {
    return null;
  }
  return dateStr.map(parseInt);
}

function unpackShowInfo(line: string[]) {
  return {
    title: line[0],
    venue: unpackVenue(line[1]),
    duration: line[2],
    startTime: unpackStartTime(line[3]),
    dates: unpackDates(line[4]),
    href: line[5],
    note: line[6],
  }
}

const Date = styled.span`
    text-align: center;
`;

function Dates({dates}: {dates: DatesT}) {
  return <Date>{dates ? dates[0] : "-"}</Date>;
}

type ShowInfo = ReturnType<typeof unpackShowInfo>;

function ShowLink({showInfo}: {showInfo: ShowInfo}) {
  const {title, href} = showInfo;
  return <a href={href} target="_blank" rel="noreferrer">{title}</a>;
}

function StartTime({startTime}: {startTime: StartTimeT}) {
  return <span>{startTime || "misc"}</span>;
}
 
function compareShowInfo(info1: ShowInfo, info2: ShowInfo) {

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

  return compareDates(info1.dates, info2.dates) || 
    compareTimes(info1.startTime, info2.startTime);
}

function App() {
  useEffect(() => {
    document.title = 'Fringe Favourites';
  });

  const gridElems: JSX.Element [] = [];
  
  const showInfo = favourites.map(unpackShowInfo).sort(compareShowInfo);

  let key = 0 
  for(const info of showInfo) {
    gridElems.push(<ShowLink key={++key} showInfo={info} />);
    gridElems.push(<StartTime key={++key} startTime={info.startTime} />);
    gridElems.push(<Dates key={++key} dates={info.dates} />);
    gridElems.push(<span key={++key}>{info.duration}</span>);
    gridElems.push(<span key={++key}>{info.note}</span>);
    gridElems.push(<span key={++key}>{info.venue}</span>);
  }
  
  return <ShowList>{gridElems}</ShowList>;
}

export default App;
