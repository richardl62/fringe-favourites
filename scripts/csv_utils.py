"""Write favourites in a Richard-friendly csv format"""
RATINGS = "ratings.txt"
CSV = "../src/favourites.csv"

def get_link_ratings():
    """Get show ratings"""
    ratings = {}
    with open(RATINGS,  mode='r', encoding='windows-1252') as csv:
        lineno = 0
        for line in csv:
            lineno += 1
            if line.strip() == "":
                continue
            try:
                split = line.split(" ")

                link = split[0].strip()
                rating = split[1].strip()

                ratings[link] = rating
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

def write_csv(favourites):
    """Write favourites in a Richard-friendly csv format"""
    with open(CSV,  mode='w', encoding='windows-1252') as csv:
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
