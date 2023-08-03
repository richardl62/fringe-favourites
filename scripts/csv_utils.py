"""Write favourites in a Richard-friendly csv format"""
from consts import RATINGS_FILE, UNRATED, UNRATED_FILE, FAVOURITES_CSV

def get_link_ratings():
    """Get show ratings"""
    ratings = {}
    with open(RATINGS_FILE,  mode='r', encoding='windows-1252') as csv:
        lineno = 0
        for fullline in csv:
            lineno += 1

            line = fullline.strip()
            if line == "" or line[0] == "#":
                continue

            try:
                split = line.split(" ")

                link = split[0].strip()
                rating = split[1].strip()
                ratings[link] = rating
                if not rating.isdigit():
                    print(f'WARNING: rating: "{rating}" for {link} is not a digit')
            except Exception as err:   # pylint: disable=broad-except
                print(f'WARNING: Cannot process line {lineno}: {line}')
                print(f"Reported error {err}\n")

    return ratings

def check_link_ratings(unpacked, ratings):
    """Check for ratings that are not in 'unpacked'"""
    unpacked_ratings = {}
    for elem in unpacked:
        unpacked_ratings[elem["link"]] = elem["rating"]

    for rated_link in ratings:
        if rated_link not in unpacked_ratings:
            print(f"WARNING: Rated show {rated_link} is not in converted data")
        else:
            from_unpacked = unpacked_ratings[rated_link]
            from_ratings = ratings[rated_link]
            if from_ratings != from_unpacked:
                print(f"WARNING: Rated for {rated_link} is inconsisted")

    with open(UNRATED_FILE,  mode='w', encoding='windows-1252') as unrated:
        for show, rating in unpacked_ratings.items():
            if rating == UNRATED:
                unrated.write(show+"\n")

def write_csv(favourites):
    """Write favourites in a Richard-friendly csv format"""
    with open(FAVOURITES_CSV,  mode='w', encoding='windows-1252') as csv:
        for fav in favourites:
            title = fav["title"]
            venue = fav["venue"]
            duration = fav["duration"]
            times = fav["times"]
            dates = fav["dates"]
            rating = fav["rating"]
            link = fav["link"]

            data = (title,times,venue,duration,dates,rating,link)
            line = ",".join(data)+"\n"

            csv.write(line)
