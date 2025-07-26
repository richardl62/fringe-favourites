"""Add non-bookmark info to show information"""

def add_non_bookmark_info(show_info):
    """Add non-bookmark information to shows"""

    # shows is a dictionary mapping URLs to show information
    for info in show_info:
        info['venue'] = 'Unknown Venue'
        info['duration'] = '00:00'
        info['booked'] = False
        info['dates'] = "9 10 11 12"  # Example dates
