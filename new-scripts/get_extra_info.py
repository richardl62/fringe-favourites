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

            match = re.search(r'(https[^ ]*) +([^ ]+) "(.*)" *(.*)$', line)
            if match:
                info.append({
                    "url": match.group(1),
                    "duration": match.group(2),
                    "dates": match.group(3),
                    "venue": match.group(4)
                })
            else:
                print(f"Bad extra info: {line}")
            
    return info
