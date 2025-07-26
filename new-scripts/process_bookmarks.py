"""Process a CSV exported from edfringe"""
import glob
import sys
import re

from file_names import CHROME_BOOKMARKS_REGEX

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
    match = re.search(r'^([0-9]) +([^ ]+) +- +([^|]+)', bookmark_name)
    if match:
        rating = match.group(1)
        start_time = match.group(2)
        title = match.group(3).strip()
        if(rating and start_time and title):
            return {
                'rating': rating,
                'start_time': start_time,
                'title': title
            }

    raise ValueError(f"Bookmark name '{bookmark_name}' does not match expected pattern")


def get_shows_from_bookmarks():
    """Extract relevant bookmarks from exported file"""

    filenames = glob.glob(CHROME_BOOKMARKS_REGEX)

    if len(filenames) == 0 :
        print(f"Error: file called matching '{CHROME_BOOKMARKS_REGEX}' not found")
        sys.exit()

    if len(filenames) > 1 :
        print(f"Error: More than one file matching '{CHROME_BOOKMARKS_REGEX}' was found")
        sys.exit()

    shows = {}
    with open(filenames[0],encoding='UTF-8') as bookmarks:
        try:
            for line in bookmarks:
                if 'https://www.edfringe.com' in line:
                    bookmark_name, url = get_name_and_url(line)
                    shows[url] = unpack_bookmark_name(bookmark_name)
        except Exception as e:
            print(f"Error processing bookmarks: {e} {line}")

    return shows

def main():
    """Main function to read and process bookmarks"""
    shows = get_shows_from_bookmarks()
    for url, details in shows.items():
        print(f"{url}: {details}")

if __name__ == "__main__":
    main()
