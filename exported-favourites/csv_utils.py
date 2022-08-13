"""Write favourites in a Richard-friendly csv format"""
OLD_CSV = "old_csv.csv"
CSV = "csv.csv"

def get_notes():
    """Get the notes column from a csv"""
    notes = {}
    with open(OLD_CSV,  mode='r', encoding='windows-1252') as csv:
        for line in csv:
            split = line.split(",")

            title = split[0]
            note = split[5]

            notes[title] = note

    return notes

def check_notes(unpacked, notes):
    """Check for notes that are not in 'unpacked'"""
    shownames = set()
    for elem in unpacked:
        shownames.add(elem["title"])

    for title in notes:
        if title not in shownames:
            print(f"WARNING: Show with note {title} is not converted data")


def write_csv(favourites):
    """Write favourites in a Richard-friendly csv format"""
    with open(CSV,  mode='w', encoding='windows-1252') as csv:
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

            csv.write(line)
