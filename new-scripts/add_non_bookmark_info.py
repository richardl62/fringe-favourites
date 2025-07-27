"""Add non-bookmark info to show information"""
from file_names import EXTRA_INFO_NEEDED

def add_non_bookmark_info(show_info):
    """Add non-bookmark information to shows"""

    ein_count = 0
    with open(EXTRA_INFO_NEEDED, 'w', encoding='utf-8') as ein:
        # shows is a dictionary mapping URLs to show information
        for info in show_info:
            ein.write(f"{info['url']}\n")
            ein_count += 1

            info['venue'] = 'unknown'
            info['duration'] = 'unknown'
            info['dates'] = 'unknown'
            info['booked'] = False

    print(f"{ein_count} shows need extra information.")
