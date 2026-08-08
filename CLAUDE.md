# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working preferences

- Favour simplicity and clarity over performance.
- Use a fail-fast principle. Prefer throws, assertions, or even exceptions to workarounds that might hide mistakes in the design. When an invariant is violated, throw explicitly rather than silently skipping.
- Make good use of TypeScript, in particular avoid unnecessary `any`.
- If something is unclear, ask — don't hide confusion.
- If a simpler or cleaner approach exists say so and push back when warranted.
- If an instruction seems ill-judged or undesirable say so and push back when warranted.
- When making changes also update tests as appproprate.
- Don't commit changes unless asked. When committing, ingore public/my_fringe_favourites.csv and public/shows.yaml (unless asked to include them).

## Environment

- Node version is pinned via Volta (`volta` field in package.json) and documented in `engines`; Vite 8's bundled rolldown requires Node ^20.19.0 or >=22.12.0 and crashes on older versions. Install Volta (https://volta.sh) on any new machine so `node -v` auto-resolves to the pinned version.
