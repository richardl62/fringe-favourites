
import { ShowInfo, favourites as unprocessedFavourites } from "./favourites";

function compareShowInfo(info1: ShowInfo, info2: ShowInfo, 
    {sortByRating, sortByDate}:
        {sortByRating: boolean, sortByDate: boolean}
)
     {

    const compareRatings = (info1: ShowInfo, info2: ShowInfo) => {
        const ratingValue = (info:ShowInfo) => {
            if(info.booked) {
                return 100; // arbitrary large number
            }
            if(info.rating === "-") {
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

    return (
        (sortByDate && compareDates(info1, info2)) ||
        (sortByRating && compareRatings(info1, info2)) ||
        compareTimes(info1, info2)
    );
}

function JSONcopy<T>(item: T) : T {
    return JSON.parse(JSON.stringify(item));
}
export function getSortedFavourites({sortByRating, startDate}
    : {sortByRating: boolean, startDate: number | null}
) {
    const favourites = JSONcopy(unprocessedFavourites);
    
    if (startDate) {
        for (const fav of favourites) {
            fav.dates = fav.dates?.filter(date => (date >= startDate))
        }
    }
    const filteredFavourites = favourites.filter(fav => fav.dates.length > 0)
    
    return filteredFavourites.sort((f1, f2) => compareShowInfo(f1,f2, 
        {sortByRating, sortByDate: startDate !== null}
    ));
}