// Non-fatal issues found while loading show data, surfaced on the #problems page
// rather than aborting the whole load - the source files are hand-edited and
// occasional mistakes are expected.
export type ProblemSeverity = "error" | "warning";

export interface Problem {
  severity: ProblemSeverity;
  message: string;
}

export function warn(message: string): Problem {
  return { severity: "warning", message };
}

export function error(message: string): Problem {
  return { severity: "error", message };
}
