import styled from "styled-components";
import { DatesT, ShowInfo, StartTimeT } from "./show-info";

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
export function ShowInfoList({showInfo} : {showInfo: ShowInfo []}) {
    if(!showInfo.length) {
      return <div>No shows found</div>
    }
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

    return <ShowList>{gridElems}</ShowList>
}