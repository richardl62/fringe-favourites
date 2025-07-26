"""Write favourites in a Richard-friendly csv format"""
import re
from file_names import BOOKINGS_FILE, RATINGS_FILE, START_TIMES_FILE, FAVOURITES_CSV

def get_link_ratings():
    """Get show ratings"""
    ratings = {}
    with open(RATINGS_FILE,  mode='r', encoding='windows-1252') as csv:
        lineno = 0
        for fullline in csv:
            lineno += 1

            line = fullline.strip()
            if line == "" or line[0] == "#":
                continue

            try:
                split = line.split(" ")

                link = split[0].strip()
                rating = split[1].strip()
                ratings[link] = rating
                if not re.fullmatch("[0-3][kx]?", rating, re.IGNORECASE):
                    print(f'WARNING: rating: "{rating}" for {link} is not recognised')
            except Exception as err:   # pylint: disable=broad-except
                print(f'WARNING: Cannot process line {lineno}: {line} of link ratings')
                print(f"Reported error {err}\n")

    return ratings

def get_bookings():
    """Get details of booked shows"""
    ratings = {}
    with open(BOOKINGS_FILE,  mode='r', encoding='windows-1252') as bookings:
        lineno = 0
        for fullline in bookings:
            lineno += 1

            line = fullline.strip()
            if line == "" or line[0] == "#":
                continue

            try:
                split = line.split(" ")

                link = split[0].strip()
                date = split[1].strip()
                if date.isdecimal():
                    ratings[link] = date
                else:
                    print(f'WARNING: booking date: "{date}" for {link} is not recognised')

            except Exception as err:   # pylint: disable=broad-except
                print(f'WARNING: Cannot process line {lineno}: {line} of booked shows')
                print(f"Reported error {err}\n")

    return ratings

def add_start_times(all_times, specific_times):
    """Add specific start times to a dictionart of start times"""
    split = specific_times.split("|")
    assert len(split) == 2, f'Cannot process start times "{specific_times}"'

    def add_time(date, time):
        date_s = str(date)
        assert date_s not in all_times, "start time for date {date} recorded twice"
        all_times[date_s] = time

    [date_or_range, time] = split
    if "-" in date_or_range:
        # It's a range
        [start_s, end_s] = date_or_range.split("-")
        start = int(start_s)
        end = int(end_s)
        for date in range(start, end):
            add_time(date, time)
    else:
        # It's a single value
        add_time(int(date_or_range), time)

def get_start_times():
    """Get start times for specific dates.
    For use with shows with multiple start times"""
    result = {}
    with open(START_TIMES_FILE,  mode='r', encoding='windows-1252') as start_times:
        lineno = 0
        for fullline in start_times:
            lineno += 1

            line = fullline.strip()
            if line == "" or line[0] == "#":
                continue
            try:
                split = line.split(" ")
                link = split.pop(0)
                all_times = {}
                for specific_times in split:
                    add_start_times(all_times, specific_times)

                result[link] = all_times

            except Exception as err: # pylint: disable=broad-except
                print(f'WARNING: Cannot process line {lineno}: {line} of {START_TIMES_FILE}')
                print(f"Reported error {err}\n")

    return result

def process_times(times):
    """Handle case when times is a dictionary"""
    if isinstance(times, str):
        return times
    else:
        return "misc"

def write_csv(favourites):
    """Write favourites in a Richard-friendly csv format"""
    with open(FAVOURITES_CSV,  mode='w', encoding='windows-1252') as csv:
        for link, fav in favourites.items():
            title = fav["title"]
            venue = fav["venue"]
            duration = fav["duration"]
            times = process_times(fav["times"])
            dates = fav["dates"]
            rating = fav["rating"]

            data = (title,times,venue,duration,dates,rating,link)
            line = ",".join(data)+"\n"

            csv.write(line)
