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
- `npm run tidy-shows` sorts entries alphabetically by id, adds `rating: "?"`
  to any entry that doesn't have a rating yet, and adds/updates a trailing
  `# Show Title` comment on each entry so the file can be searched by name
  despite being keyed by id.
- `npm run update-shows` runs `fetch-dates:quick` followed by `tidy-shows`,
  and is the normal way to bring shows.yaml up to date. Run
  `npm run fetch-dates` (without `--quick`) occasionally too, to pick up
  date/time changes on shows already scraped.
