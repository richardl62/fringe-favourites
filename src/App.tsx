import React from 'react';
import styled from "styled-components";
import { favourites } from './favourites';

const Details = styled.div`
  display: inline-grid;
  grid-template-columns: repeat(7, auto);
`;

type StartTimeT = {hour: number, min: number} | "misc" | "error";

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
  return <span>{`${hour}:${min}`}</span>
}

function App() {

  const gridElems: JSX.Element [] = [];
  
  for(const line of favourites) {
    const info = unpackShowInfo(line);
    gridElems.push(<ShowLink showInfo={info} />);
    gridElems.push(<StartTime startTime={info.startTime} />);
    gridElems.push(<span>{info.duration}</span>);
    gridElems.push(<span>{info.venue}</span>);
    gridElems.push(<Dates dates={info.dates} />);
    gridElems.push(<span>{info.rRating}</span>);
    gridElems.push(<span>{info.kRating}</span>);
  }

  gridElems.push(<span>End</span>);

  return <Details>{gridElems}</Details>;
}

export default App;
