import type { JSX } from "react";
import styled from "styled-components";
import { unknownDate, type DatesT } from "./data/types";
import { ShowInfo } from "./get-favourites";
import { ExtendedShowInfo } from "./add-next-performance";

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString()}:${mins.toString().padStart(2, "0")}`;
}

// "Room at Venue" is shortened to just "Venue" - the room number rarely
// means much on its own. Splits on the first " at " so a venue name that
// itself contains "at" (e.g. "Just The Tonic at The Caves") stays intact.
function formatVenue(venue: string): string {
  const separator = " at ";
  const index = venue.indexOf(separator);
  return index === -1 ? venue : venue.slice(index + separator.length);
}

// Brighter than "firebrick" so it's unmistakable in a dense grid of small text.
const UNAVAILABLE_COLOR = "red";

const UnavailableText = styled.span<{ $unavailable: boolean }>`
  color: ${(props) => (props.$unavailable ? UNAVAILABLE_COLOR : "inherit")};
`;

const DateSpan = styled(UnavailableText)`
  text-align: center;
`;

function Date({
  date,
  startDate,
  unavailable,
}: {
  date: number | typeof unknownDate;
  startDate: number | null;
  unavailable: boolean;
}) {
  if (date === startDate) {
    return null;
  }
  return <DateSpan $unavailable={unavailable}>{date}</DateSpan>;
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
  const { startTime, startTimeVaries, startTimeUnavailable, booked } = showInfo;
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

  return <UnavailableText $unavailable={startTimeUnavailable}>{time}</UnavailableText>;
}

// The dates a show is still on from the selected Date onwards (or all of
// them, if no Date is set) - each individually flagged red if it has no
// allocation remaining. When "Available only" is on, such dates have
// already been dropped upstream (see filter-available-dates.ts), so none
// show up here at all.
function RemainingDates({
  dates,
  noAvailability,
  booked,
  startDate,
}: {
  dates: DatesT;
  noAvailability: number[];
  booked: boolean;
  startDate: number | null;
}) {
  if (dates === unknownDate) {
    return <span>{unknownDate}</span>;
  }
  const remaining =
    startDate === null ? dates : dates.filter((date) => date >= startDate);

  return (
    <span>
      {remaining.map((date, index) => (
        <UnavailableText
          key={date}
          $unavailable={!booked && noAvailability.includes(date)}
        >
          {index > 0 ? `, ${String(date)}` : date}
        </UnavailableText>
      ))}
    </span>
  );
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
  showRemainingDates,
}: {
  showInfo: ExtendedShowInfo[];
  startDate: number | null;
  showRemainingDates: boolean;
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
      <Date
        date={info.nextPerformance}
        startDate={startDate}
        unavailable={info.nextPerformanceUnavailable}
      />,
      rowKey,
      "dates",
    );
    addElem(formatDuration(info.durationMinutes), rowKey, "duration");
    addElem(ratingString(info), rowKey, "rating");
    addElem(
      showRemainingDates ? (
        <RemainingDates
          dates={info.dates}
          noAvailability={info.noAvailability}
          booked={info.booked}
          startDate={startDate}
        />
      ) : (
        formatVenue(info.venue)
      ),
      rowKey,
      "venue",
    );
  });

  return <ShowList>{gridElems}</ShowList>;
}
