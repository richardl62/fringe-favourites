"""Tools to update data from imported favourites """

from consts import START_TIMES_FILE, UNRATED, UNRATED_FILE, UNSET_START_TIME_FILE


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

def check_start_times(old_times_joined, new_times):
    """Sanity check new (manually entered) start times"""
    old_times_list = old_times_joined.split()
    assert len(old_times_list) > 1, "Unnecessary use of hand written start times"
    for date in new_times:
        time = new_times[date]
        assert time in old_times_list, f'{new_times[date]} is not a valid start time'


def add_start_times(favourites, start_times):
    """Add details of show times to favourites"""
    for link in start_times:
        try:
            assert link in favourites, "link not in favourates"
            check_start_times(favourites[link]["times"], start_times[link])
            favourites[link]["times"] = start_times[link]
        except Exception as err:   # pylint: disable=broad-except
            print(f'Error {err} while processing start times for {link}')

    with open(UNSET_START_TIME_FILE,  mode='w', encoding='windows-1252') as unset_start_time:
        unset_start_time.write('# Shows with variable start times that do not feature ')
        unset_start_time.write(f'in {START_TIMES_FILE}\n')
        for link in favourites:
            start = favourites[link]["times"]
            if isinstance(start, str) and " " in start:
                unset_start_time.write(f'{link}\n')
