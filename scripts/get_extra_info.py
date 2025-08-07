"""get non-bookmark information """

import re
from file_names import EXTRA_INFO

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

                info.append({
                    "url": url,
                    "duration": duration,
                    "dates": dates,
                    "venue": venue
                })
            except ValueError as err:
                print(f"Error in extra info: {err} in {line}")

    return info
