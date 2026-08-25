Make a webpage with details of selected fringe shows.

The webpage is published in Github pages as
https://richardl62.github.io/fringe-favourites.

Updates can be deployed using npm run deploy

The data used by the page is entirely in `public/shows.yaml` - one entry per
show, keyed by an id, with:
  - (synced from the CSV, or hand written for a show that isn't in it) title,
    venue, duration, start time, url.
  - (scrapped) The dates the show is on.
  - (scrapped) Per-date start times for shows for which the start time varies
  - (hand written) Rating
  - (hand written) Date on which the show is booked

This file is processed at page load. After a change to it, reload the page
to see the result.

- Anything unexpected or missing while loading (a show with no notes yet,
  inconsistent dates/times, a flagged sync/scrape problem) is reported on
  the page reachable via the "Problems" link, rather than breaking the page.

`public/my_fringe_favourites.csv` (edfringe.com's export of the user's
favourited shows) is an offline input to `npm run sync-csv` below, not
something the page itself reads.

Some scripts exist to help update shows.yaml:

- `npm run sync-csv` reads `public/my_fringe_favourites.csv` and writes each
  show's title/venue/duration/start time/url into shows.yaml, creating a new
  entry if needed and overwriting those fields on every run - don't hand-edit
  them for a CSV-sourced show. A show no longer in the CSV export isn't
  deleted; a `# PROBLEM: ...` comment is added above its entry instead, left
  for you to remove by hand if you want.
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
- `npm run tidy-shows` sorts entries alphabetically by id and adds
  `rating: "?"` to any entry that doesn't have a rating yet (unless it's
  booked).
- `npm run update-shows` runs `sync-csv`, `fetch-dates`, `fetch-free-fringe`,
  and `tidy-shows` in sequence, and is the normal way to bring shows.yaml
  fully up to date. `npm run update-shows:quick` does the same with both
  fetch steps in `--quick` mode.
