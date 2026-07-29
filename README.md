Make a webpage with details of selected fringe shows.

The webpage can be published in Github pages as
https://richardl62.github.io/fringe-favourites

In summary,

- `public/my_fringe_favourites.csv` is the principal list of shows, exported
  from edfringe.com. Add or remove rows there; the format is fixed by
  edfringe.com's export.
- `public/shows.yaml` holds hand-written info the CSV doesn't provide -
  rating, which dates you're considering, booking status, and start-time
  overrides for shows whose time varies by performance - plus full entries
  for the rare show that isn't in the edfringe.com export (e.g. a
  free-fringe listing).
- Everything is fetched and parsed in the browser at page load - there is no
  build/generation step. Edit the files above and refresh.
- Anything unexpected or missing while loading (a malformed CSV row, a show
  with no notes yet, inconsistent dates/times) is reported on the page
  reachable via the "Problems" link, rather than breaking the page.

The site can by deployed to Github pages using
npm run deploy
