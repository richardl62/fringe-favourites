""" Names and locations of input and output files"""

CHROME_BOOKMARKS_REGEX = "input/bookmarks_*"

NON_BOOKMARK_SHOWS = "input/non-fringe-shows.csv"

BOOKED = "input/booked.txt"

EXTRA_INFO = "input/extra_info.txt"

EXTRA_INFO_NEEDED = "generated/extra_info_needed.txt"

START_TIMES = "input/start_times.txt"

VARIABLE_START_TIMES = "generated/variable_start_times.txt"

"""Bookmarks to edfringe.com that were not successfully processed probably
becase the rating and time when not correctly added to the name"""
BAD_BOOKMARKS = "generated/bad_bookmarks.txt"

"""Type formatted favourites in 'raw' format"""
#FAVOURITE_TS = "generated/raw-favourites.ts"
FAVOURITE_TS = "../src/raw-favourites.ts"
