"""Process information about shows from bookmarks and elsewhere"""
from get_shows_from_bookmarks import get_shows_from_bookmarks
from get_non_bookmark_shows import get_non_bookmark_shows
from get_extra_info import get_extra_info
from write_favourites_ts import write_favourites_ts
from add_extra_info import add_extra_info
from add_bookings import add_bookings
from add_start_times import add_start_times


def main():
    """Main function to read and process show info"""
    shows = get_shows_from_bookmarks()
    print(f"{len(shows)} shows details extracted from bookmarks.")

    non_bookmark_shows = get_non_bookmark_shows()
    print(f"{len(non_bookmark_shows)} non-bookmark shows processed.")
    shows.extend(non_bookmark_shows)

    extra_info = get_extra_info()

    add_extra_info(shows, extra_info)

    add_bookings(shows)

    # For use with shows with variable start times
    add_start_times(shows)

    write_favourites_ts(shows)

if __name__ == "__main__":
    main()
