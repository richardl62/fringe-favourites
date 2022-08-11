"""Process a CSV exported from edfringe"""
import re
import glob
import sys

START_DATE = 16


def remove_non_ascii(text):
    """Remove no-ascii characters"""
    return ''.join(i for i in text if ord(i) > 0)

def read_exported_favourites():
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
                favourites.append(line)

    return favourites


def make_js_string(text):
    """Make a JS string"""
    if text != "" and text[0] == '"':
        return text
    else:
        return f'"{text}"'

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
    return make_js_string(out_dates.rstrip())

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

    return make_js_string(f"{hours}:{mins}")

def make_href(exported_ref):
    """Make href to edfringe"""
    return make_js_string("https://tickets.edfringe.com" + exported_ref)

def make_output_line(line):
    """Make a line for favourites.js"""
    elems = line.split("	")

    title = make_js_string(elems[0])
    venue = make_js_string(elems[2])
    duration = process_duration(elems[3])
    times = make_js_string(elems[4])
    dates = process_dates(elems[5])
    link = make_href(elems[6])
    rnote=make_js_string("-")
    knote=make_js_string("-")

    data = (title,venue,duration,times,dates,link,rnote,knote)
    return "["+ ", ".join(data) + "]"


def doit():
    """Put the whole thing together"""
    lines = read_exported_favourites()
    with open("favourites.ts", encoding="windows-1252", mode='w') as favourites:

        favourites.write("export const favourites = [\n")
        for line in lines:
            try:
                outline = make_output_line(line)
                favourites.write(f"{outline}\n")

            except Exception as err:   # pylint: disable=broad-except
                print(f'WARNING: Cannot process line: {line}\n')
                print(f"Reported error {err}\n")


        favourites.write("];\n")

        print("Done")

doit()
