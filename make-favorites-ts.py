import re
import io
import glob
import sys

start_date = 16
end_date = 22

def remove_non_ascii(text):
    return ''.join(i for i in text if ord(i) > 0)

def process_raw_line(text):
    return remove_non_ascii(text).strip().replace("'","\\'")

def get_exported_favourites():
    filenames = glob.glob('fringe_search_results*')

    if len(filenames) == 0 :
        print("Error: file called 'fringe_search_results*' not found")
        sys.exit()

    if len(filenames) > 1 :
        print("Error: More  than one file called \'fringe_search_results*\' was found")
        sys.exit()

    return filenames[0]

# /*, encoding='utf-8'*/
with open(get_exported_favourites(),encoding='windows-1252') as exported_favourites,\
    open("favourites.ts",  mode='w') as favourites:   

    favourites.write("export const favourites = [\n")

    lineno = 0
    for raw_line in exported_favourites:

        if not raw_line:
            break


        line = process_raw_line(raw_line).strip()
        if(len(line) > 0):
            try:
                lineno += 1
                if (lineno > 1):
                    favourites.write("'%s',\n" % line)

            except Exception as e:
                print("WARNING: Cannot process line ", lineno, ":", raw_line, "\n", 
                "Report error: ", e, "\n")
                
    favourites.write("];\n")

print("Done")




