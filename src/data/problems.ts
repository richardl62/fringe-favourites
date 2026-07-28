// Non-fatal issues found while loading show data, surfaced on the #problems page
// rather than aborting the whole load - the source files are hand-edited and
// occasional mistakes are expected.
export type ProblemSeverity = "error" | "warning";

export interface ProblemShowLink {
  title: string;
  url: string;
}

export interface Problem {
  severity: ProblemSeverity;
  message: string;
  link?: ProblemShowLink;
}

export function warn(message: string, link?: ProblemShowLink): Problem {
  return { severity: "warning", message, link };
}

export function error(message: string, link?: ProblemShowLink): Problem {
  return { severity: "error", message, link };
}
