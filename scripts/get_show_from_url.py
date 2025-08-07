""" Utility function """

def get_show_from_url(shows, url):
    """ Find the show with the given link"""
    for show in shows:
        if show['url'] == url:
            return show
    return None