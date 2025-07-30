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

    for info in extra_info:
        url = info['url']
        show = get_show_from_url(shows, url)
        if show:
            show['duration'] = info['duration']
            show['dates'] = info['dates']
            show['venue'] = info['venue']
        else:
            print(f"WARNING: {url} has extra info but no bookmark info")

    ein_count = 0
    with open(EXTRA_INFO_NEEDED, 'w', encoding='utf-8') as ein:
        # shows is a dictionary mapping URLs to show information
        for show in shows:
            if not 'duration' in show:
                ein.write(f"{show['url']} {DUMMY_EXTRA_INFO}\n")
                ein_count += 1
                show['venue'] = '?'
                show['duration'] = '?'
                show['dates'] = '?'

    for show in shows:
        show['booked'] = False

    print(f"{ein_count} shows need extra information.")
