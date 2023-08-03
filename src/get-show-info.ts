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

export type DatesT = number[] | null;
function unpackDates(dates: string): DatesT {
    const dateStr = dates.split(" ");
    if (dateStr[0] === "") {
        return null;
    }
    return dateStr.map(parseInt);
}

/** Get show info from a raw favourite */
export function getShowInfo(line: string[]) {
    return {
        title: line[0],
        venue: unpackVenue(line[1]),
        duration: line[2],
        startTime: unpackStartTime(line[3]),
        dates: unpackDates(line[4]),
        href: line[5],
        rating: line[6],
    }
}

export type ShowInfo = ReturnType<typeof getShowInfo>;