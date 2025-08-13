import { ExtendedShowInfo } from "./add-next-performance";
import { ShowInfo, unknownDate } from "./get-favourites";

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

const compareDates = (info1: ExtendedShowInfo, info2: ExtendedShowInfo, todaysDate: number) => {

    const nextPossibleDate = (info: ExtendedShowInfo) => {
        if (info.nextPerformance === unknownDate) {
            return todaysDate;
        }
        return info.nextPerformance;
    }

    return nextPossibleDate(info1) - nextPossibleDate(info2);
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

export function sortFavourites({favourites, sortByRating, sortByDate}
    : {favourites: ExtendedShowInfo[], sortByRating: boolean, sortByDate: boolean}
) {
    // Shows with unspecified dates are treated as starting on todays date when sorting
    const today = new Date();
    const todaysDate = today.getDate();
    
    favourites.sort((f1, f2) => 
        (sortByDate && compareDates(f1, f2, todaysDate)) ||
        (sortByRating && compareRatings(f1, f2)) ||
        compareTimes(f1, f2)
    );
}