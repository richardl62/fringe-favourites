import { ShowInfo } from "./get-favourites";

const compareRatings = (info1: ShowInfo, info2: ShowInfo) => {
    const ratingValue = (info: ShowInfo) => {
        if (info.booked) {
            return 100; // arbitrary large number
        }
        if (info.rating === "-") {
            return 1;
        }
        return parseInt(info.rating);
    }
    return ratingValue(info2) - ratingValue(info1);
}

const compareDates = (info1: ShowInfo, info2: ShowInfo) => {
    if (info1.dates.length === 0 || info2.dates.length === 0) {
        throw new Error("Date array is empty")
    }

    return info1.dates[0] - info2.dates[0];
}

const compareTimes = (info1: ShowInfo, info2: ShowInfo) => {
    const t1 = info1.startTime;
    const t2 = info2.startTime;

    if (t1 && t2) {
        return t1.localeCompare(t2);
    } else if (t1) {
        return -1;
    } else if (t2) {
        return 1;
    } else {
        return 0;
    }
}

/** For each show, remove any start dates that are before the given date,
 * and return the shows that have at least one date remaining.
 */
export function filterByDate(favourites: ShowInfo[], startDate: number) {
    for (const fav of favourites) {
        fav.dates = fav.dates?.filter(date => (date >= startDate))
    }
    return favourites.filter(fav => fav.dates.some(date => date >= startDate));
}

export function sortFavourites({favourites, sortByRating, sortByDate}
    : {favourites: ShowInfo[], sortByRating: boolean, sortByDate: boolean}
) {
    favourites.sort((f1, f2) => 
        (sortByDate && compareDates(f1, f2)) ||
        (sortByRating && compareRatings(f1, f2)) ||
        compareTimes(f1, f2)
    );
}