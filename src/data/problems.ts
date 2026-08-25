// Non-fatal issues found while loading show data, surfaced on the #problems page
// rather than aborting the whole load - the source files are hand-edited and
// occasional mistakes are expected.
import { edfringeShowUrl } from "./edfringe-url.ts";

export type ProblemSeverity =
  | "error"
  | "warning"
  | "unrated"
  | "multiplePerformances"
  | "unconsidered";

export interface ProblemShowLink {
  title: string;
  url: string;
}

export interface Problem {
  severity: ProblemSeverity;
  message: string;
  link?: ProblemShowLink;
  /** A vscode://file/... link to the relevant spot in shows.yaml (or, for an
   * "unconsidered" problem, scotsman-fringe-reviews.yaml), if known (see
   * vscode-link.ts). Only ever set when running locally. */
  editLink?: string;
  /** Star rating (1-5) - only set for "unconsidered" problems, so they can
   * be grouped and ordered highest-rated first on the #problems page. */
  rating?: number;
  /** A guessed edfringe.com show page - only set for "unconsidered"
   * problems (see edfringe-url.ts). A guess, not a validated link. */
  edfringeUrl?: string;
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

export function multiplePerformances(
  dates: number[],
  link?: ProblemShowLink,
  editLink?: string,
): Problem {
  return {
    severity: "multiplePerformances",
    message: `: Dates ${dates.join(", ")}`,
    link,
    editLink,
  };
}

export function unconsidered(
  rating: number,
  link?: ProblemShowLink,
  editLink?: string,
): Problem {
  return {
    severity: "unconsidered",
    message: "",
    link,
    editLink,
    rating,
    edfringeUrl: link ? edfringeShowUrl(link.title) : undefined,
  };
}
