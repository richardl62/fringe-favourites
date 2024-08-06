"""Tools to update data from imported favourites """

from consts import UNRATED, UNRATED_FILE


def add_link_ratings(favourites, ratings):
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


def add_bookings(favourites, bookings):
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

def check_start_times(old_times, new_times):
    """Sanity check new (manually entered) start times"""
    print(old_times.split(), new_times)

def add_start_times(favourites, start_times):
    """Add details of show times to favourites"""
    for link in start_times:
        if link in favourites:
            check_start_times(favourites[link]["times"], start_times[link])
        else:
            print(f"Unknown link {link} in start times")
