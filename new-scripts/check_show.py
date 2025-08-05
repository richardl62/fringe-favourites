""" Run basic checks on show show """
import re

def check_url(url):
    """Sanity check"""

def check_title(title):
    """Sanity check"""

def check_duration(duration):
    """Sanity check"""
    if duration == "0:00" or not re.match(r"^\d:\d\d", duration):
        raise ValueError(f"bad duration {duration}")

def check_times(times):
    """Sanity check"""

def check_dates(dates):
    """Sanity check"""
    for date in dates.split():
        if not re.match(r"\d?\d", date):
            raise ValueError(f"bad date {date}")

def check_venue(venue):
    """Sanity check"""
    if venue == "venue" or re.match(r"[\"]", venue):
        raise ValueError(f"bad venue {venue}")

def check_rating(rating):
    """Sanity check"""

def check_booked(booked):
    """Sanity check"""

def check_show(show):
    """ Run checks on one show"""

    check_url(show["url"])
    check_title(show["title"])
    check_duration(show["duration"])
    check_times(show["times"])
    check_dates(show["dates"])
    check_venue(show["venue"])
    check_rating(show["rating"])
    check_booked(show["booked"])