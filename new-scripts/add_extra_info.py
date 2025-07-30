"""Add non-bookmark info to show information"""
from file_names import EXTRA_INFO_NEEDED

DUMMY_EXTRA_INFO = "0:00 [9 10 11 12 13 14 15 16 17 18] venue"

def add_extra_info(show_info, extra_info):
    """Add extra (non-bookmark) information to shows"""
    print(extra_info)

    ein_count = 0
    with open(EXTRA_INFO_NEEDED, 'w', encoding='utf-8') as ein:
        # shows is a dictionary mapping URLs to show information
        for info in show_info:
            ein.write(f"{info['url']} {DUMMY_EXTRA_INFO}\n")
            ein_count += 1

            info['venue'] = '?'
            info['duration'] = '?'
            info['dates'] = '?'
            info['booked'] = False

    print(f"{ein_count} shows need extra information.")
