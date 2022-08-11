import re
import io
import glob
import sys

start_date = 16


def remove_non_ascii(text):
    return ''.join(i for i in text if ord(i) > 0)

# Find and read the exported favourites. Return the result as an array line.
# The header line and non-ascii characters are removed.
def read_exported_favourites():
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
            if(len(line) > 0):
                favourites.append(line)
    
    return favourites


def make_js_string(text):
    if text != "" and text[0] == '"':
        return text
    else:
        return '"%s"' % text

def process_dates(raw_dates):
    # dates are in a string line "9 Aug, 13 Aug, 21 Aug" (with the quotes)
    # and can sometimes include in July 
    #date_array = raw_dates.replace("Aug","").replace(" ","").replace('"',"").split(",")

    out_dates=""
    #for date in date_array:
    #    if date_in_range(date):
    #        out_dates += date + " "
    for date in raw_dates.replace("\"","").split(",") :
        if "Aug" in date: 
            num = date.replace("Aug","")
            if float(num) >= start_date:
                out_dates += num.strip() + " "
    return make_js_string(out_dates.rstrip())

def process_duration(raw_duration):

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
        
    return make_js_string("%s:%s" % (hours, mins))

def make_href(exported_ref):
    return make_js_string("https://tickets.edfringe.com" + exported_ref)

def make_output_line(line):
    elems = line.split("	")
    
    title = make_js_string(elems[0])
    venue = make_js_string(elems[2])
    duration = process_duration(elems[3])
    times = make_js_string(elems[4])
    dates = process_dates(elems[5])
    link = make_href(elems[6])
    R=make_js_string("-")
    K=make_js_string("-")

    data = (title,venue,duration,times,dates,link,R,K)
    return "["+ ", ".join(data) + "]"


def doit():
    lines = read_exported_favourites()
    with open("favourites.ts",  mode='w') as favourites:   

        favourites.write("export const favourites = [\n")
        for line in lines:
            try:
                favourites.write("%s,\n" % make_output_line(line))
            except Exception as e:
                print("WARNING: Cannot process line:\"", line, "\"\n",
                        "Report error: ", e, "\n")

        favourites.write("];\n")

        print("Done")

doit()



