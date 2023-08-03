import { favourites as rawFavourites } from "./raw-favourites";
import { DatesT, ShowInfo, StartTimeT, makeShowInfo } from "./show-info";

function compareShowInfo(info1: ShowInfo, info2: ShowInfo, compareRatingParam: boolean) {

    const compareRatings = (rating1: string, rating2: string) => {
        return -rating1.localeCompare(rating2);
    }

    const compareDates = (d1: DatesT, d2: DatesT) => {
        if (d1 === null && d2 === null) {
            return 0;
        } else if (d1 === null) {
            return 1;
        } else if (d2 === null) {
            return -1;
        } else {
            return d1[0] - d2[0];
        }
    }

    const compareTimes = (t1: StartTimeT, t2: StartTimeT) => {

        if (t1 === null && t2 === null) {
            return 0;
        } else if (t1 === null) {
            return 1;
        } else if (t2 === null) {
            return -1;
        } else {
            return t1.localeCompare(t2);
        }
    }

    return (compareRatingParam && compareRatings(info1.rating, info2.rating)) ||
        compareDates(info1.dates, info2.dates) ||
        compareTimes(info1.startTime, info2.startTime);
}
  
export function getSortedFavourites({sortByRating}: {sortByRating: boolean}) {
    const unsortedFavourites = rawFavourites.map(makeShowInfo);

    return unsortedFavourites.sort((f1, f2) => compareShowInfo(f1,f2, sortByRating));
}