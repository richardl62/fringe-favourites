"""Process information about shows from bookmarks and elsewhere"""
import glob
import sys
import re

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
    bookmark_group = "-"
    with open(filenames[0],encoding='UTF-8') as bookmarks, \
        open(UNPROCESSED_BOOKMARKS, 'w', encoding='UTF-8') as unprocessed:
        for line in bookmarks:
            try:
                match = re.match(r".*<H3[^>]+>([^<]+)",line)
                if match:
                    bookmark_group = match.group(1)

                if 'https://www.edfringe.com/tickets/' in line:
                    bookmark_name, url = get_name_and_url(line)
                    info = unpack_bookmark_name(bookmark_name)
                    info['url'] = url
                    show_info.append(info)
                    if bookmark_group != "EDShows":
                        print(f'WARNING: Unexpected bookmark group "{bookmark_group}" for {url}')
            except ValueError as e:
                unprocessed.write(f"{line.strip()} {e}\n")
                unprocessed_count += 1

    if unprocessed_count > 0:
        print(f"WARNING: {unprocessed_count} bookmarks were not processed successfully.",
              f"Check {UNPROCESSED_BOOKMARKS} for details.")

    return show_info
