// Provide a function to return a lightly processed version of raw-favourites.
import { favourites as rawFavourites } from "./raw-favourites";
export type RawStartTimesT = string | Record<number,string>

// Covert uppercase words to camel case
function convertUpperCaseWords(str: string): string {
    const convertOneWord = (str: string) => {
        if (str === str.toUpperCase()) {
            return str.charAt(0) + str.slice(1).toLowerCase();
        }
        return str;
    }

     return str.split(" ").map(convertOneWord).join(" ");
}

function processTitle(title: string) {
    const simpleCharacters = title.replace(/[^A-Za-z0-9 ]/g, "");
    return convertUpperCaseWords(simpleCharacters) 
}

function processVenue(venue: string) {
    return convertUpperCaseWords(venue);
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

export const unknownDate = '?';
export type DatesT = number[];

function processDates(dates: string): DatesT | typeof unknownDate {
    if (dates === unknownDate) {
        return unknownDate;
    }
    
    const dateStr = dates.split(" ");
    return dateStr.map(d => parseInt(d));
}

/** Make a ShowInfo from raw info about one show */
type Line = [string, string, string, RawStartTimesT, string, string, string, boolean]
function processOneFavourite(line: Readonly<Line>, date: number | null) {

    const obj = {
        title: processTitle(line[0]),
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

/*** Return a lightly processed version of favourites data generate by python scripts.
 * No sorting or filtering is done at this stage, but required date (if any) is used
 * to determine the start time of relevant shows.
*/
export function getFavourites(date: number | null) {
    return rawFavourites.map(fav => processOneFavourite(fav, date));
}


