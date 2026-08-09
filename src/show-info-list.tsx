import type { JSX } from "react";
import styled from "styled-components";
import { unknownDate } from "./data/types";
import { ShowInfo } from "./get-favourites";
import { ExtendedShowInfo } from "./add-next-performance";

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString()}:${mins.toString().padStart(2, "0")}`;
}

const DateSpan = styled.span`
  text-align: center;
`;

function Date({
  date,
  startDate,
}: {
  date: number | typeof unknownDate;
  startDate: number | null;
}) {
  if (date === startDate) {
    return null;
  }
  return <DateSpan>{date}</DateSpan>;
}

function ShowLink({ showInfo }: { showInfo: ShowInfo }) {
  const { title, url } = showInfo;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      {title}
    </a>
  );
}

function StartTime({ showInfo }: { showInfo: ShowInfo }) {
  const { startTime, startTimeVaries, booked } = showInfo;
  let time: string;
  if (startTime === null) {
    time = "misc";
  } else {
    time = startTime;
  }

  // The "+" flags a time resolved from a show's other, varying performances -
  // meaningless for a booked show, which only ever has the one date.
  if (startTimeVaries && !booked) {
    time += "+";
  }

  return <span>{time}</span>;
}

const ShowList = styled.div`
  display: inline-grid;

  background-color: lightgrey;
  border: lightgrey solid 1px;
  gap: 1px;
  grid-template-columns: minmax(auto, 24em) repeat(3, auto) auto minmax(
      auto,
      1fr
    );
`;

const Wrapper = styled.div`
  background-color: white;

  overflow: hidden;
  white-space: nowrap;

  padding-right: 4px;
`;
export function ShowInfoList({
  showInfo,
  startDate,
}: {
  showInfo: ExtendedShowInfo[];
  startDate: number | null;
}) {
  if (!showInfo.length) {
    return <div>No shows found</div>;
  }
  const gridElems: JSX.Element[] = [];

  const addElem = (
    elem: JSX.Element | string,
    rowKey: string,
    item: string,
  ) => {
    const key = rowKey + item;
    gridElems.push(<Wrapper key={key}>{elem}</Wrapper>);
  };

  const ratingString = (info: ShowInfo) =>
    info.booked ? "B" : info.rating.toString();

  // A show can appear twice (once per performance) when it has two
  // performances on the selected date - so the url alone isn't a unique key.
  showInfo.forEach((info, index) => {
    const rowKey = `${info.url}-${String(index)}`;
    addElem(<ShowLink showInfo={info} />, rowKey, "link");
    addElem(<StartTime showInfo={info} />, rowKey, "start");
    addElem(
      <Date date={info.nextPerformance} startDate={startDate} />,
      rowKey,
      "dates",
    );
    addElem(formatDuration(info.durationMinutes), rowKey, "duration");
    addElem(ratingString(info), rowKey, "rating");
    addElem(info.venue, rowKey, "venue");
  });

  return <ShowList>{gridElems}</ShowList>;
}
