"""Tools for specifying variable start times """
from file_names import START_TIMES, VARIABLE_START_TIMES
from get_show_from_url import get_show_from_url

def set_start_times(show, times):
    """Set the times for the show after some sanity checks"""
    dates = show["dates"].split()
    
    bad_dates = []
    for date in times.keys():
        if not date in dates:
            bad_dates.append(date)

    if len(bad_dates) > 0:
        print(f"WARNING: Start times and dates inconsistent for {show["url"]}: Problem dates {bad_dates}")
    
    show["times"] = times

def add_times(times, spec):
    """Add specific start times to a dictionart of start times"""
    split = spec.split("|")
    assert len(split) == 2, f'Cannot process start times "{split}"'

    def add_time(date, time):
        date_s = str(date)
        assert date_s not in times, "start time for date {date} recorded twice"
        times[date_s] = time

    [date_or_range, time] = split
    if "-" in date_or_range:
        # It's a range
        [start_s, end_s] = date_or_range.split("-")
        start = int(start_s)
        end = int(end_s)
        for date in range(start, end):
            add_time(date, time)
    else:
        # It's a single value
        add_time(int(date_or_range), time)

def add_start_times(shows):
    """Get start times for specific dates.
    For use with shows with multiple start times"""

    with open(START_TIMES,  mode='r', encoding='windows-1252') as start_times:
        lineno = 0
        for fullline in start_times:
            lineno += 1

            line = fullline.strip()
            if line == "" or line[0] == "#":
                continue
            try:
                split = line.split(" ")
                link = split.pop(0)
                show = get_show_from_url(shows, link)
                assert show, f"Start times specified for unrecognised show {show}"
                assert show["times"] == "misc", \
                     f"Start times explicitly specified for show with known start time {show}"

                times = {}
                for time_spec in split:
                    add_times(times, time_spec)

                set_start_times(show, times)


            except Exception as err: # pylint: disable=broad-except
                print(f'WARNING: Cannot process line {lineno}: {line} of {START_TIMES}: {err}')

    vst_count = 0
    with open(VARIABLE_START_TIMES, "w", encoding='windows-1252') as vst:
        for show in shows:
            if show["times"] == "misc":
                vst_count += 1
                vst.write(show["url"] + "\n")

    if vst_count > 0:
        print(f"{vst_count} shows have do not have start times set")
