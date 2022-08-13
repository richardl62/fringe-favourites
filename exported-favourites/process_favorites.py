"""Process a CSV exported from edfringe"""
import glob
import sys
import re

from ts_utils import write_favourites_ts
from csv_utils import get_notes, check_notes, write_csv

START_DATE = 16

def remove_non_ascii(text):
    """Remove no-ascii characters"""
    return ''.join(i for i in text if ord(i) > 0)

def process_title(raw_title):
    """Process tile read from exported favourites"""
    return raw_title.replace(",", "")

def process_venue(raw_venue):
    """Process venue read from exported favourites"""
    return raw_venue.replace(",", "")

def process_duration(raw_duration):
    """Process duration read from exported favourites"""
    hours = "0"
    match_hours = re.search(r"([0-9]+) hour", raw_duration)
    if match_hours:
        hours = match_hours.group(1)

    mins = "00"
    match_mins = re.search(r"([0-9]+) minutes", raw_duration)
    if match_mins:
        mins = match_mins.group(1)
        if len(mins) == 1:
            mins = "0" + mins

    return f"{hours}:{mins}"

def process_times(raw_times):
    """Process start times read from exported favourites"""
    return raw_times.replace(", "," ")

def process_dates(raw_dates):
    """dates are in a string line "9 Aug, 13 Aug, 21 Aug" (with the quotes)
    and can sometimes include in July"""
    out_dates=""
    #for date in date_array:
    #    if date_in_range(date):
    #        out_dates += date + " "
    for date in raw_dates.replace("\"","").split(","):
        if "Aug" in date:
            num = date.replace("Aug","")
            if float(num) >= START_DATE:
                out_dates += num.strip() + " "
    return out_dates.rstrip()

def make_link(exported_ref):
    """Make href to edfringe"""
    return "https://tickets.edfringe.com" + exported_ref

def basic_convert_favourite_line(line):
    """Convert line from exported favourites"""
    split = line.split("	")

    return {
        "title": process_title(split[0]),
        "venue": process_venue(split[2]),
        "duration": process_duration(split[3]),
        "times": process_times(split[4]),
        "dates": process_dates(split[5]),
        "link": make_link(split[6]),
    }

def add_note(converted, notes):
    """And note element to show info"""
    note = notes.get(converted["title"], "-")
    converted["note"] = note

def read_exported_favourites(notes):
    """ Find and read the exported favourites. Return the result as an array line.
    The header line and non-ascii characters are removed."""
    filenames = glob.glob('fringe_search_results*')

    if len(filenames) == 0 :
        print("Error: file called 'fringe_search_results*' not found")
        sys.exit()

    if len(filenames) > 1 :
        print("Error: More  than one file called \'fringe_search_results*\' was found")
        sys.exit()

    favourites = []
    with open(filenames[0],encoding='windows-1252') as exported_favourites:
        exported_favourites.readline() # skip the header line
        for raw_line in exported_favourites:
            line = remove_non_ascii(raw_line).strip()
            if len(line) > 0:
                converted = basic_convert_favourite_line(line)
                add_note(converted, notes)
                favourites.append(converted)

    return favourites


def doit():
    """Put the whole thing together"""
    notes = get_notes()
    unpacked = read_exported_favourites(notes)
    check_notes(unpacked, notes)
    write_favourites_ts(unpacked)
    write_csv(unpacked)

doit()
