import React from 'react';
import styled from "styled-components";
import { favourites } from './favourites';

const Details = styled.div`
  display: inline-grid;
  grid-template-columns: repeat(7, auto);
`;

type HourMin = {hour: number, min: number};
type StartTimeT = HourMin | "misc" | "error";

function unpackStartTime(times: string) : StartTimeT {
  if(times.includes(",")) {
    return "misc";
  }

  const parts = times.split(":");
  if(parts.length !== 2) {
    return "error";
  }

  return {
    hour: parseInt(parts[0]), 
    min: parseInt(parts[1])
  };
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
    venue: line[1],
    duration: line[2],
    startTime: unpackStartTime(line[3]),
    dates: unpackDates(line[4]),
    href: line[5],
    rRating: line[6],
    kRating: line[7],
  }
}

function Dates({dates}: {dates: DatesT}) {
  return <span>{dates ? dates[0] : ""}</span>;
}

type ShowInfo = ReturnType<typeof unpackShowInfo>;

function ShowLink({showInfo}: {showInfo: ShowInfo}) {
  const {title, href} = showInfo;
  return <a href={href} target="_blank" rel="noreferrer">{title}</a>;
}

function StartTime({startTime}: {startTime: StartTimeT}) {
  if(typeof startTime === "string") {
    return <span>{startTime}</span>
  }

  const {hour, min} = startTime;
  return <span>{`${hour}:${min}`}</span>;
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
    const isString = (t1: StartTimeT) => typeof t1 === "string";
    
    if (isString(t1) && isString(t2)) {
      return 0;
    } else if (isString(t1)) {
      return 1;
    } else if (isString(t2)) {
      return -1;
    } else {
      const hm1 = t1 as HourMin;
      const hm2 = t2 as HourMin;
      return (hm1.hour - hm2.hour) || (hm1.min - hm2.min);
    }
  }

  return compareDates(info1.dates, info2.dates) || 
    compareTimes(info1.startTime, info2.startTime);
}

function App() {

  const gridElems: JSX.Element [] = [];
  
  const showInfo = favourites.map(unpackShowInfo).sort(compareShowInfo);

  let key = 0 
  for(const info of showInfo) {
    gridElems.push(<ShowLink key={++key} showInfo={info} />);
    gridElems.push(<StartTime startTime={info.startTime} />);
    gridElems.push(<Dates dates={info.dates} />);
    gridElems.push(<span>{info.duration}</span>);
    gridElems.push(<span>{info.venue}</span>);
    gridElems.push(<span>{info.rRating}</span>);
    gridElems.push(<span>{info.kRating}</span>);
  }
  
  return <Details>{gridElems}</Details>;
}

export default App;
