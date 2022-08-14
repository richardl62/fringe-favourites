"""Make favourites.ts"""

def make_js_string(text):
    """Make a JS string"""
    if text != "" and text[0] == '"':
        return text
    else:
        return f'"{text}"'

def make_output_line(fav):
    """Make a line for favourites.js"""
    title = make_js_string(fav["title"])
    venue = make_js_string(fav["venue"])
    duration = make_js_string(fav["duration"])
    times = make_js_string(fav["times"])
    dates = make_js_string(fav["dates"])
    link = make_js_string(fav["link"])
    rating=make_js_string(fav["rating"])

    data = (title,venue,duration,times,dates,link,rating)
    return "["+ ", ".join(data) + "]"

def write_favourites_ts(favourites):
    """Write favourites.ts"""
    with open("favourites.ts", encoding="windows-1252", mode='w') as favourites_ts:

        favourites_ts.write("export const favourites = [\n")
        for fav in favourites:
            try:
                outline = make_output_line(fav)
                favourites_ts.write(f"{outline},\n")

            except Exception as err:   # pylint: disable=broad-except
                print(f'WARNING: Cannot process line: {fav}\n')
                print(f"Reported error {err}\n")


        favourites_ts.write("];\n")

        print("Done")
