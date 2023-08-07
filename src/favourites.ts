import { favourites as rawFavourites } from "./raw-favourites";

function unpackVenue(venue: string) {
    // To do consider proper implemenation of camel case 
    return venue.replace("ROUNDABOUT", "Roundabout");
}

export type StartTimeT = string | null; // null -> More than one start time is listed

function unpackStartTime(times: string): StartTimeT {
    if (times.includes(" ")) {
        return null;
    }

    return times;
}

export type DatesT = number[];
function unpackDates(dates: string): DatesT {
    const dateStr = dates.split(" ");
    if (!dateStr[0]) {
        return [];
    }
    // dateStr.map(parseInt) gived bad results because the index supplied by
    // the map is treated as a radix.
    return dateStr.map(d => parseInt(d));
}

/** Make a ShowInfo from raw info about one show */
type Line = [string, string, string, string, string, string, string, boolean]
function makeShowInfo(line: Readonly<Line>) {

    const obj = {
        title: line[0],
        venue: unpackVenue(line[1]),
        duration: line[2],
        startTime: unpackStartTime(line[3]),
        dates: unpackDates(line[4]),
        href: line[5],
        rating: line[6],
        booked: line[7],
    }
    return obj;
}

export type ShowInfo = ReturnType<typeof makeShowInfo>;

export const favourites = rawFavourites.map(makeShowInfo);

//https://stackoverflow.com/questions/34776846/how-to-freeze-nested-objects-in-javascript
function deepFreeze (o: any) {
  Object.freeze(o);
  if (o === undefined) {
    return o;
  }

  Object.getOwnPropertyNames(o).forEach(function (prop) {
    if (o[prop] !== null
    && (typeof o[prop] === "object" || typeof o[prop] === "function")
    && !Object.isFrozen(o[prop])) {
      deepFreeze(o[prop]);
    }
  });

  return o;
}
deepFreeze(favourites);
