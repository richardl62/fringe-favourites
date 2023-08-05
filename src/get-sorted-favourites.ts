import { favourites as rawFavourites } from "./raw-favourites";
import { DatesT, ShowInfo, StartTimeT, makeShowInfo } from "./show-info";

function compareShowInfo(info1: ShowInfo, info2: ShowInfo, 
    {sortByRating, sortByDate}:
        {sortByRating: boolean, sortByDate: boolean}
)
     {

    const compareRatings = (rating1: string, rating2: string) => {
        const ratingValue = (str:string) => {
            if(str === "-") {
                return 1;
            }
            return parseInt(str);
        }
        return ratingValue(rating2) - ratingValue(rating1);
    }

    const compareDates = (d1: DatesT, d2: DatesT) => {
        if (d1.length === 0 || d2.length === 0) {
            throw new Error("Date array is empty")
        }

        return d1[0] - d2[0];
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

    return (
        (sortByDate && compareDates(info1.dates, info2.dates)) ||
        (sortByRating && compareRatings(info1.rating, info2.rating)) ||
        compareTimes(info1.startTime, info2.startTime)
    );
}
  
export function getSortedFavourites({sortByRating, startDate}
    : {sortByRating: boolean, startDate: number | null}
) {
    const unsortedFavourites = rawFavourites.map(makeShowInfo);

    if (startDate) {
        for (const fav of unsortedFavourites) {
            fav.dates = fav.dates?.filter(date => (date >= startDate))
        }
    }
    const filteredFavourites = unsortedFavourites.filter(fav => fav.dates.length > 0)
    
    return filteredFavourites.sort((f1, f2) => compareShowInfo(f1,f2, 
        {sortByRating, sortByDate: startDate !== null}
    ));
}