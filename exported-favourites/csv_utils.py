"""Write favourites in a Richard-friendly csv format"""

def write_csv(favourites):
    """Write favourites in a Richard-friendly csv format"""
    with open("favourites_csv.csv",  mode='w', encoding='windows-1252') as shows_csv:
        for fav in favourites:
            title = fav["title"]
            venue = fav["venue"]
            duration = fav["duration"]
            times = fav["times"]
            dates = fav["dates"]
            note = fav["note"]
            link = fav["link"]

            data = (title,times,venue,duration,dates,note,link)
            line = ",".join(data)+"\n"

            shows_csv.write(line)
