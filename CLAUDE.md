# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working preferences

- Favour simplicity and clarity over performance.
- Use a fail-fast principle. Prefer throws, assertions, or even exceptions to workarounds that might hide mistakes in the design. When an invariant is violated, throw explicitly rather than silently skipping.
- Make good use of TypeScript, in particular avoid unnecessary `any`.
- If something is unclear, ask — don't hide confusion.
- If a simpler or cleaner approach exists, say so and push back when warranted.
- Match existing code style even if you'd do it differently.
- Aim to keep code changes surgical. If you see tidy ups that are not required for the current task, mention them but don't fix them.
