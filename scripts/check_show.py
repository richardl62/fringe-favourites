""" Run basic checks on show info
    They raise a ValueError if a problem is found and otherwise return the input value.
    They are used when writing tp typescript (which is the last thing do with show info)
"""
import re

from consts import UNSET
TIME_RE = r"^\d\d:\d\d$"
DATE_RE = r"^\d?\d$"

def check_url(url):
    """Sanity check"""
    if url != url.strip():
        raise ValueError(f"Url as whitespace at start or end '{url}'")
    return url

def check_title(title):
    """Sanity check"""
    if title != title.strip():
        raise ValueError(f"Title as whitespace at start or end '{title}'")
    return title

def check_times(times):
    """Sanity check"""

    if times == "misc":
        pass
    elif isinstance(times, str):
        if not re.match(TIME_RE, times):
            raise ValueError(f"bad start time '{times}'")
    elif isinstance(times, dict):
        for date in times:
            if not re.match(DATE_RE, date):
                raise ValueError(f"Start times includes bad date '{date}'")

            time = times[date]
            if not re.match(TIME_RE, time):
                raise ValueError(f"Start times includes bad time '{time}'")
    else:
        raise ValueError(f"start times not of recognised type {times}")

    return times

def check_duration(duration):
    """Sanity check"""
    if duration != UNSET:
        if duration == "0:00" or not re.match(r"^\d:\d\d$", duration):
            raise ValueError(f"bad duration {duration}")

    return duration

def check_dates(dates):
    """Sanity check"""
    if dates != UNSET:
        for date in dates.split():
            if not re.match(DATE_RE, date):
                raise ValueError(f"bad date '{date}'")

    return dates

def check_venue(venue):
    """Sanity check"""

    if venue == "venue" or re.match(r"[\"]", venue):
        raise ValueError(f"bad venue {venue}")

    return venue

def check_rating(rating):
    """Sanity check"""
    if not re.match(r"^\d$", rating):
        raise ValueError(f"bad duration {rating}")

    return rating

def check_booked(booked):
    """Sanity check"""
    if not isinstance(booked, bool):
        raise ValueError(f"bad booked field {booked}")

    return booked
