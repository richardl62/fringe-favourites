import { ShowInfo, unknownDate } from "./get-favourites";


export interface ExtendedShowInfo extends ShowInfo {
    // The next date on which the show will be performed.  More precisely:
    // - unknownDate if the performances dates for the show are not known
    // - the first date in the dates array if the UI start date is not set.
    // - the first date in the dates array on or after the UI start date if it is set
    // Shows with no suitable dates are filtered out.
    nextPerformance: number | typeof unknownDate;
}

 /** Add next performance date to shows in the favourites list, 
  * or filter out shows with no remaining performances */
export function addNextPerformance(favourites: ShowInfo[], startDate: number | null): ExtendedShowInfo[] {
    const extendedInfo: ExtendedShowInfo[] = [];

    let nextPerformance: number | typeof unknownDate | undefined;
    for (const fav of favourites) {
        if (fav.dates === unknownDate) {
            nextPerformance = unknownDate;
        } else if (startDate === null) {
            nextPerformance = fav.dates[0];
        } else {
            nextPerformance = fav.dates.find(date => date >= startDate);
        }

        if (nextPerformance !== undefined) {
            extendedInfo.push({
                ...fav,
                nextPerformance,
            });
        }
    }

    return extendedInfo;
}