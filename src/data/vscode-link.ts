const path = import.meta.env.VITE_SHOWS_YAML_PATH;

/** Build a vscode://file/... link that opens shows.yaml at a given line, for
 * jumping straight from a problem to its source while developing locally.
 * Only produces a link if VITE_SHOWS_YAML_PATH (an absolute path to
 * public/shows.yaml) is set - see .env.local - so this is a no-op in
 * production and for anyone who hasn't configured it. */
export function showsYamlEditLink(line: number): string | undefined {
  if (!path) {
    return undefined;
  }
  return `vscode://file/${path.replace(/\\/g, "/")}:${String(line)}:1`;
}
