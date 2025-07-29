import styled from "styled-components";
import { ShowInfo, unknownDate } from "./get-favourites";
import { ExtendedShowInfo } from "./add-next-performance";

const DateSpan = styled.span`
    text-align: center;
`;

function Date({date, startDate}: {date: number | typeof unknownDate, startDate: number | null}) {
  if(date === startDate) {
    return null;
  }
  return <DateSpan>{date}</DateSpan>;
}

function ShowLink({showInfo}: {showInfo: ShowInfo}) {
  const {title, href} = showInfo;
  return <a href={href} target="_blank" rel="noreferrer">{title}</a>;
}

function StartTime({showInfo}: {showInfo: ShowInfo}) {
  const {startTime, startTimeVaries} = showInfo;
  let time: string;
  if (startTime === null) {
     time = "misc";
  } else {
     time = startTime;
  }
  
  if(startTimeVaries) {
    time += "+";
  }
  
  return <span>{time}</span>;
}
 
const ShowList = styled.div`
  display: inline-grid;
  
  background-color: lightgrey;
  border: lightgrey solid 1px;
  gap: 1px;
  grid-template-columns: minmax(auto, 24em) repeat(3, auto) auto minmax(auto, 1fr)
`;
  

const Wrapper = styled.div`
  background-color: white;
  
  overflow: hidden;
  white-space: nowrap;

  padding-right: 4px;
`
export function ShowInfoList({showInfo, startDate} : 
    {showInfo: ExtendedShowInfo [], startDate: number | null}
  ) {
    if(!showInfo.length) {
      return <div>No shows found</div>
    }
    const gridElems: JSX.Element [] = [];
  
    const addElem = (elem: JSX.Element | string, info: ShowInfo, item: string) => {
        const key = info.href + item;
        gridElems.push(<Wrapper key={key}>{elem}</Wrapper>);
    }
  
    const ratingString = (info: ShowInfo) =>
      info.booked ? "*" : info.rating;

    for(const info of showInfo) {
      addElem(<ShowLink showInfo={info} />, info, "link");
      addElem(<StartTime showInfo={info} />, info, "start");
      addElem(<Date date={info.nextPerformance} startDate={startDate} />, info, "dates");
      addElem(info.duration, info, "duration");
      addElem(ratingString(info), info, "rating");
      addElem(info.venue, info, "venue");
    }

    return <ShowList>{gridElems}</ShowList>
}