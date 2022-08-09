import React from 'react';
import styled from "styled-components";
import { favourites } from './favourites';

const Details = styled.div`
  display: inline-grid;
  grid-template-columns: auto auto;
`;

function unpackShowInfo(line: string[]) {
  return {
    title: line[0],
    venue: line[1],
    href: line[5],
  }
}

type ShowInfo = ReturnType<typeof unpackShowInfo>;

function ShowLink({showInfo}: {showInfo: ShowInfo}) {
  const {title, href} = showInfo;
  return <a href={href} target="_blank" rel="noreferrer">{title}</a>;
}
function App() {

  const gridElems: JSX.Element [] = [];
  
  for(const line of favourites) {
    const info = unpackShowInfo(line);
    gridElems.push(<ShowLink showInfo={info} />);
    gridElems.push(<span>{info.venue}</span>);
  }

  gridElems.push(<span>End</span>);

  return <Details>{gridElems}</Details>;
}

export default App;
