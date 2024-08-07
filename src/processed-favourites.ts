// Provide a function to return a lightly processed version of raw-favourites.
import { favourites as rawFavourites } from "./raw-favourites";
export type RawStartTimesT = string | Record<number,string>

function processVenue(venue: string) {
    // To do consider proper implemenation of camel case 
    return venue.replace("ROUNDABOUT", "Roundabout");
}

export interface ProcssedStartTime {
    startTime: string | null;
    startTimeVaries: boolean;
}
function processStartTime(times: RawStartTimesT, date: number | null): ProcssedStartTime {
    if (typeof times === "string") {
        if(times.includes(" ")) {
            // The is more than one start time, and no information about which time
            // goes with which day.
            return {startTime: null, startTimeVaries: true}
        } else {
            // Easy case: There is a single recorded start time
            return {startTime: times, startTimeVaries: false}
        }
    }

    const startTime = (date && times[date]) || null;
    return {startTime, startTimeVaries: true};
}

export type DatesT = number[];
function processDates(dates: string): DatesT {
    const dateStr = dates.split(" ");
    if (!dateStr[0]) {
        return [];
    }
    // dateStr.map(parseInt) gived bad results because the index supplied by
    // the map is treated as a radix.
    return dateStr.map(d => parseInt(d));
}

/** Make a ShowInfo from raw info about one show */
type Line = [string, string, string, RawStartTimesT, string, string, string, boolean]
function processOneFavourite(line: Readonly<Line>, date: number | null) {

    const obj = {
        title: line[0],
        venue: processVenue(line[1]),
        duration: line[2],
        dates: processDates(line[4]),
        href: line[5],
        rating: line[6],
        booked: line[7],

        ...processStartTime(line[3], date),
    }
    return obj;
}

export type ShowInfo = ReturnType<typeof processOneFavourite>;

export function processedFavourites(date: number | null) {
    return rawFavourites.map(fav => processOneFavourite(fav, date));
}


