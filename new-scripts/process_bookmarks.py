"""Process information about shows from bookmarks and elsewhere"""
import glob
import sys
import re

from get_extra_info import get_extra_info
from write_favourites_ts import write_favourites_ts
from add_extra_info import add_extra_info
from add_bookings import add_bookings
from add_start_times import add_start_times
from file_names import CHROME_BOOKMARKS_REGEX, UNPROCESSED_BOOKMARKS

def check_start_time(start_time):
    """Check if the start time is in the correct format"""

    if start_time.lower() == 'misc':
        return 'misc'

    # The expected format is 'HH:MM'
    match = re.match(r'^\d{2}:\d{2}', start_time)
    if match:
        return start_time

    raise ValueError(f"Unexpected start time '{start_time}'")

def get_name_and_url(line):
    """Extract name and URL from a bookmark line"""
    match = re.search(r'<DT><A HREF="([^"]+)" ADD_DATE="\d+" ICON="[^"]+">([^<]+)</A>', line)
    if match:
        url = match.group(1)
        name = match.group(2)
        if name and url:
            return name, url
    raise ValueError("Line format is incorrect or does not match expected pattern")

def unpack_bookmark_name(bookmark_name):
    """Unpack a bookmark name"""
    match = re.search(r'^([0-9]) +([^ ]+) *- *([^|]+)', bookmark_name)
    if match:
        rating = match.group(1)
        start_time = check_start_time(match.group(2))
        title = match.group(3).strip()
        if(rating and start_time and title):
            return {
                'title': title,
                'rating': rating,
                # Times can be a single time or 'misc' or, later, a list of times
                'times': start_time
            }

    raise ValueError(f"Bookmark name '{bookmark_name}' does not match expected pattern")


def get_shows_from_bookmarks():
    """Extract relevant bookmarks from exported file"""

    filenames = glob.glob(CHROME_BOOKMARKS_REGEX)

    if len(filenames) == 0 :
        print(f"Error: No files matching '{CHROME_BOOKMARKS_REGEX}' found")
        sys.exit()

    if len(filenames) > 1 :
        print(f"Error: More than one file matching '{CHROME_BOOKMARKS_REGEX}' was found")
        sys.exit()

    show_info = []
    unprocessed_count = 0
    with open(filenames[0],encoding='UTF-8') as bookmarks, \
        open(UNPROCESSED_BOOKMARKS, 'w', encoding='UTF-8') as unprocessed:
        for line in bookmarks:
            try:
                if 'https://www.edfringe.com' in line:
                    bookmark_name, url = get_name_and_url(line)
                    info = unpack_bookmark_name(bookmark_name)
                    info['url'] = url
                    show_info.append(info)
            except ValueError as e:
                unprocessed.write(f"{line.strip()} {e}\n")
                unprocessed_count += 1

    if unprocessed_count > 0:
        print(f"WARNING: {unprocessed_count} bookmarks were not processed successfully.",
              f"Check {UNPROCESSED_BOOKMARKS} for details.")

    return show_info

def main():
    """Main function to read and process bookmarks"""
    shows = get_shows_from_bookmarks()
    print(f"{len(shows)} shows details extracted from bookmarks.")

    extra_info = get_extra_info()

    add_extra_info(shows, extra_info)

    add_bookings(shows)

    # For use with shows with variable start times
    add_start_times(shows)

    write_favourites_ts(shows)

if __name__ == "__main__":
    main()
