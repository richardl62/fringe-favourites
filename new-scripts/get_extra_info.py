"""get non-bookmark information """

import re
from file_names import EXTRA_INFO

def check_duration(duration):
    """Sanity check"""
    if duration == "0:00" or not re.match(r"^\d:\d\d", duration):
        raise ValueError(f"Bad duration \"{duration}\"")

def check_dates(dates):
    """Sanity check"""
    for date in dates.split():
        if not re.match(r"\d?\d", date):
            raise ValueError(f"Bad date \"{date}\"")


def check_venue(venue):
    """Sanity check"""
    if venue == "venue" or re.match(r"[\"]", venue):
        raise ValueError(f"Bad venue \"{venue}\"")

def get_extra_info():
    """get non-bookmark information """
    info = []
    with open(EXTRA_INFO,encoding='UTF-8') as extra_info:
        for line in extra_info:
            #ignore blank lines and comments
            if line.strip() == "" or line[0] == '#':
                continue
            try:
                match = re.search(r'(https[^ ]*) +([^ ]+) "(.*)" *(.*)$', line)
                if not match:
                    raise ValueError("Format not recognised")

                [url, duration, dates, venue] = match.groups()
                check_duration(duration)
                check_dates(dates)
                check_venue(venue)

                info.append({
                    "url": url,
                    "duration": duration,
                    "dates": dates,
                    "venue": venue
                })
            except ValueError as err:
                print(f"Error in extra info: {err} in {line}")

    return info
