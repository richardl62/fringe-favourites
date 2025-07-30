"""get non-bookmark information """

import re
from file_names import EXTRA_INFO

def process_dates(date_string):
    """convert date string into an array"""
    return date_string.split()

def get_extra_info():
    """get non-bookmark information """
    info = []
    with open(EXTRA_INFO,encoding='UTF-8') as extra_info:
        for line in extra_info:
            match = re.search(r'(https[^ ]*) +([^ ]+) "(.*)" *(.*)', line)
            info.append({
                "link": match.group(1),
                "duration": match.group(2),
                "dates": process_dates(match.group(3)),
                "venue": match.group(4)
            })
    return info
