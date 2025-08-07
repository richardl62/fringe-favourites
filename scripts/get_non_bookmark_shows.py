"""Read information about non-fringe shows"""
from file_names import NON_BOOKMARK_SHOWS

def get_non_bookmark_shows():
    """Read information about non-fringe shows"""

    shows = []
    with open(NON_BOOKMARK_SHOWS,encoding='UTF-8') as extra_info:
        for line in extra_info:
            #ignore blank lines and comments
            if line.strip() == "" or line[0] == '#':
                continue
            try:
                parts = [x.strip() for x in line.split(",")]
                if len(parts) != 7:
                    raise ValueError(f"Expected 7 parts but got {len(parts)}")

                # URL, NAME, TIME, DURATION, DATES, VENUE, RATING
                [url, title, times, duration, dates, venue, rating]  = parts

                # check_duration(duration)
                # check_dates(dates)
                # check_venue(venue)

                shows.append({
                    "url": url,
                    "title": title,
                    "times": times,
                    "duration": duration,
                    "dates": dates,
                    "venue": venue,
                    "rating": rating,
                })
            except ValueError as err:
                print(f"Error in extra info: {err} in {line}")
    return shows
