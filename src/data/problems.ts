// Non-fatal issues found while loading show data, surfaced on the #problems page
// rather than aborting the whole load - the source files are hand-edited and
// occasional mistakes are expected.
export type ProblemSeverity = "error" | "warning" | "unrated";

export interface ProblemShowLink {
  title: string;
  url: string;
}

export interface Problem {
  severity: ProblemSeverity;
  message: string;
  link?: ProblemShowLink;
  /** A vscode://file/... link to the relevant spot in shows.yaml, if known
   * (see vscode-link.ts). Only ever set when running locally. */
  editLink?: string;
}

export function warn(
  message: string,
  link?: ProblemShowLink,
  editLink?: string,
): Problem {
  return { severity: "warning", message, link, editLink };
}

export function error(
  message: string,
  link?: ProblemShowLink,
  editLink?: string,
): Problem {
  return { severity: "error", message, link, editLink };
}

export function unrated(link?: ProblemShowLink, editLink?: string): Problem {
  return { severity: "unrated", message: "", link, editLink };
}
