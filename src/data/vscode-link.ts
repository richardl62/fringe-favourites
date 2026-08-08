import { warn, type Problem } from "./problems";

/** Build a vscode://file/... link that opens shows.yaml at a given line, for
 * jumping straight from a problem to its source while developing locally.
 * Only produces a link if VITE_SHOWS_YAML_PATH (an absolute path to
 * public/shows.yaml) is set - see .env.local - so this is a no-op in
 * production and for anyone who hasn't configured it. */
export function showsYamlEditLink(line: number): string | undefined {
  const path = import.meta.env.VITE_SHOWS_YAML_PATH;
  if (!path) {
    return undefined;
  }
  return `vscode://file/${path.replace(/\\/g, "/")}:${String(line)}:1`;
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
