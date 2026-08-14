Make a webpage with details of selected fringe shows.

The webpage is published in Github pages as
https://richardl62.github.io/fringe-favourites.

Updates can be deployed using npm run deploy

The data used by the page is in:

- `public/my_fringe_favourites.csv` is the principal list of shows, exported
  from edfringe.com.
- `public/shows.yaml` holds info the CSV doesn't provide, so of which is
  scrapped from edfringe.com and some of which is hand written.
  - (scrapped) The dates the show is on.
  - (scrapped) Per-date start times for shows for which the start time varies
  - (hand written) Rating
  - (hand written) Date on which the show is booked,

- `public/shows.yaml` also has fully handwritten entries for shows that are not
  listed on edfringe.com

This files are processed at page load. After a change to the files reload the page
to see the result.

- Anything unexpected or missing while loading (a malformed CSV row, a show
  with no notes yet, inconsistent dates/times) is reported on the page
  reachable via the "Problems" link, rather than breaking the page.

Some scripts exist to help update shows.yaml:

- `npm run fetch-dates` scrapes each show's performance dates and start times
  from edfringe.com and writes them into shows.yaml's `dates`/`times`
  fields, leaving everything else in the file untouched. A show that can't
  be fully scraped still gets whatever data is available, with a
  `# PROBLEM: ...` comment added above its entry to flag what's missing.
  `npm run fetch-dates:quick` only scrapes shows with no `dates` field yet,
  skipping everything already scraped in a previous run - much faster, at
  the cost of assuming edfringe.com hasn't changed anything for those shows
  since.
- `npm run fetch-free-fringe` scrapes title/venue/duration/start
  time/dates for each show URL listed in `public/free-fringe-favourites.txt`
  (one per line) - PBH's Free Fringe shows, which aren't in the
  edfringe.com CSV export - and writes a full entry for each into
  shows.yaml. Same `# PROBLEM: ...`/`npm run fetch-free-fringe:quick`
  behaviour as `fetch-dates` above.
- `npm run tidy-shows` sorts entries alphabetically by id, adds `rating: "?"`
  to any entry that doesn't have a rating yet (unless it's booked), and
  adds/updates a trailing `# Show Title` comment on each entry so the file
  can be searched by name despite being keyed by id.
- `npm run update-shows` runs `fetch-dates`, `fetch-free-fringe`, and
  `tidy-shows` in sequence, and is the normal way to bring shows.yaml fully
  up to date. `npm run update-shows:quick` does the same with both fetch
  steps in `--quick` mode.
