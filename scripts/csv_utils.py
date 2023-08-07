"""Write favourites in a Richard-friendly csv format"""
import re
from consts import BOOKINGS_FILE, RATINGS_FILE, UNRATED, UNRATED_FILE, FAVOURITES_CSV

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
                if not re.fullmatch("[1-3]k?", rating):
                    print(f'WARNING: rating: "{rating}" for {link} is not recognised')
            except Exception as err:   # pylint: disable=broad-except
                print(f'WARNING: Cannot process line {lineno}: {line}')
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
            if line == "":
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
                print(f'WARNING: Cannot process line {lineno}: {line}')
                print(f"Reported error {err}\n")

    return ratings

def process_link_ratings(favourites, ratings):
    """Add ratings to favourites and check for inconsistencies"""

    # Add ratings to favourites, and record any unrated shows
    num_unrated = 0
    with open(UNRATED_FILE,  mode='w', encoding='windows-1252') as unrated:
        for link, show in favourites.items():
            rating = ratings.get(link, UNRATED)
            show["rating"] = rating
            if rating == UNRATED:
                unrated.write(link+" \n")
                num_unrated += 1

    if num_unrated > 0:
        print(f"{num_unrated} show(s) not rated")

    for rated_link in ratings:
        if rated_link not in favourites:
            print(f"WARNING: Rated show {rated_link} is not in list of favourites")

def process_bookings(favourites, bookings):
    """Add details of bookings to favourites"""

    for show in favourites.values():
        show["booked"]= False

    for link, date in bookings.items():
        if link in favourites:
            show = favourites[link]
            show["dates"] = f'"{date}"'
            show["booked"] = True
        else:
            print(f"WARNING: Booked show {link} is not in list of favourites")

    for link in bookings.keys():
        if link in favourites:
            show = favourites[link]

def write_csv(favourites):
    """Write favourites in a Richard-friendly csv format"""
    with open(FAVOURITES_CSV,  mode='w', encoding='windows-1252') as csv:
        for link, fav in favourites.items():
            title = fav["title"]
            venue = fav["venue"]
            duration = fav["duration"]
            times = fav["times"]
            dates = fav["dates"]
            rating = fav["rating"]

            data = (title,times,venue,duration,dates,rating,link)
            line = ",".join(data)+"\n"

            csv.write(line)
