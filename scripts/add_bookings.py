"""Manage information about which shows are booked"""

from get_show_from_url import get_show_from_url
from file_names import BOOKED

def get_bookings():
    """Get details of booked shows"""
    bookings = []
    with open(BOOKED,  mode='r', encoding='windows-1252') as bookings_file:
        lineno = 0
        for fullline in bookings_file:
            lineno += 1

            line = fullline.strip()
            if line == "" or line[0] == "#":
                continue

            try:
                split = line.split(" ")

                link = split[0].strip()
                date = split[1].strip()
                if date.isdecimal():
                    bookings.append([link, date])
                else:
                    print(f'WARNING: booking date: "{date}" for {link} is not recognised')

            except Exception as err:   # pylint: disable=broad-except
                print(f'WARNING: Cannot process line {lineno}: {line} of booked shows')
                print(f"Reported error {err}\n")

    return bookings

def add_bookings(shows):
    """Add details of bookings to favourites"""

    for show in shows:
        show["booked"]= False

    bookings = get_bookings()

    for [link, booked_date] in bookings:
        show = get_show_from_url(shows, link)
        if show:
            show["dates"] = f'{booked_date}'
            show["booked"] = True
        else:
            print(f"WARNING: Booked show {link} is not in show list")
