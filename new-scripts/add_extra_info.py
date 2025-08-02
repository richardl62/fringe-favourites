"""Add non-bookmark info to show information"""
from file_names import EXTRA_INFO_NEEDED

DUMMY_EXTRA_INFO = "0:00 [9 10 11 12 13 14 15 16 17 18] venue"

def get_show_from_url(shows, url):
    """ Find the show with the given link"""
    for show in shows:
        if show['url'] == url:
            return show
    return False

def add_extra_info(shows, extra_info):
    """Add extra (non-bookmark) information to shows"""

    # Add known extra info to show details
    for info in extra_info:
        url = info['url']
        show = get_show_from_url(shows, url)
        if show:
            show['duration'] = info['duration']
            show['dates'] = info['dates']
            show['venue'] = info['venue']
        else:
            print(f"WARNING: {url} has extra info but no bookmark info")

    # Add dummy extra imfo to show info that needs it.
    # Keep a track of the shows for which this is done
    extra_info_needed = []
    for show in shows:
        if not 'duration' in show:
            extra_info_needed.append(show)
            show['venue'] = '?'
            show['duration'] = '?'
            show['dates'] = '?'

    # Set the 'booked' field of all show
    for show in shows:
        show['booked'] = False


    # Give information about shows that need extra info
    print(f"{len(extra_info_needed)} shows need extra information")

    # sort into reverse order of rating
    extra_info_needed.sort( key = lambda show: -int(show["rating"]) )

    last_rating = "X"
    with open(EXTRA_INFO_NEEDED, "w", encoding='utf-8') as ein:
        for show in extra_info_needed:
            rating = show["rating"]
            if rating != last_rating:
                ein.write(f"# Start of shows with rating {rating}\n")
                last_rating = rating

            ein.write(f'{show["url"]} ' +
                # Prototype version of duration, dates and venue
                '0:00 "9 10 11 12 13 14 15 16 17 18" venue\n'
            )
