import { warn, type Problem } from "./problems";

/** Build a vscode://file/... link that opens a file at a given line, for
 * jumping straight from a problem to its source while developing locally.
 * Only produces a link if `path` (an absolute path, from an env var - see
 * .env.local) is set, so this is a no-op in production and for anyone who
 * hasn't configured it. */
function editLink(path: string | undefined, line: number): string | undefined {
  if (!path) {
    return undefined;
  }
  return `vscode://file/${path.replace(/\\/g, "/")}:${String(line)}:1`;
}

/** Opens shows.yaml at a given line - see VITE_SHOWS_YAML_PATH in .env.local. */
export function showsYamlEditLink(line: number): string | undefined {
  return editLink(import.meta.env.VITE_SHOWS_YAML_PATH, line);
}

/** Opens scotsman-fringe-reviews.yaml at a given line - see
 * VITE_SCOTSMAN_REVIEWS_YAML_PATH in .env.local. */
export function scotsmanReviewsYamlEditLink(line: number): string | undefined {
  return editLink(import.meta.env.VITE_SCOTSMAN_REVIEWS_YAML_PATH, line);
}

/** A warning to surface on the #problems page when running locally without
 * VITE_SHOWS_YAML_PATH set, so the resulting silent absence of edit links
 * doesn't go unnoticed. Skipped in production, where the var is expected to
 * be unset. */
export function showsYamlPathWarning(): Problem | undefined {
  if (import.meta.env.VITE_SHOWS_YAML_PATH || !import.meta.env.DEV) {
    return undefined;
  }
  return warn(
    "VITE_SHOWS_YAML_PATH isn't set in .env.local, so edit links to shows.yaml won't appear on this page.",
  );
}
