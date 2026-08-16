import { Fragment } from "react";
import styled from "styled-components";
import type { Problem } from "./data/problems";

const Wrapper = styled.div`
  padding: 1em;
  max-width: 60em;
`;

const ProblemRow = styled.div<{ $severity: Problem["severity"] }>`
  padding: 0.25em 0;
  color: ${(props) => (props.$severity === "error" ? "firebrick" : "inherit")};
`;

const SectionHeading = styled.h2`
  font-size: 1em;
`;

function ProblemList({ problems }: { problems: Problem[] }) {
  return (
    <>
      {problems.map((problem, index) => (
        <ProblemRow key={index} $severity={problem.severity}>
          {problem.link ? (
            <>
              <a href={problem.link.url} target="_blank" rel="noreferrer">
                {problem.link.title}
              </a>
              {problem.message &&
                (problem.message.startsWith(":") ? (
                  problem.message
                ) : (
                  <> {problem.message}</>
                ))}
            </>
          ) : (
            problem.message
          )}
          {problem.editLink && (
            <>
              {" "}
              [<a href={problem.editLink}>edit</a>]
            </>
          )}
        </ProblemRow>
      ))}
    </>
  );
}

/** Groups already rating-sorted (highest first) "unconsidered" problems into
 * one list per rating, preserving that order (a Map's insertion order). */
function groupByRating(problems: Problem[]): { rating: number; problems: Problem[] }[] {
  const groups = new Map<number, Problem[]>();
  for (const problem of problems) {
    const rating = problem.rating ?? 0;
    const group = groups.get(rating) ?? [];
    group.push(problem);
    groups.set(rating, group);
  }
  return [...groups].map(([rating, group]) => ({ rating, problems: group }));
}

export function ProblemsView({
  problems,
  loadError,
}: {
  problems: Problem[];
  loadError?: string;
}) {
  const errors = problems.filter((p) => p.severity === "error");
  const warnings = problems.filter((p) => p.severity === "warning");
  const unrated = problems
    .filter((p) => p.severity === "unrated")
    .sort((a, b) => (a.link?.title ?? "").localeCompare(b.link?.title ?? ""));
  const multiplePerformances = problems
    .filter((p) => p.severity === "multiplePerformances")
    .sort((a, b) => (a.link?.title ?? "").localeCompare(b.link?.title ?? ""));
  const unconsidered = problems
    .filter((p) => p.severity === "unconsidered")
    .sort(
      (a, b) =>
        (b.rating ?? 0) - (a.rating ?? 0) ||
        (a.link?.title ?? "").localeCompare(b.link?.title ?? ""),
    );

  return (
    <Wrapper>
      <p>
        <a href="#">Back to shows</a>
      </p>
      {loadError ? (
        <ProblemRow $severity="error">
          Failed to load show data: {loadError}
        </ProblemRow>
      ) : problems.length === 0 ? (
        <div>No problems found.</div>
      ) : (
        <>
          {errors.length > 0 && (
            <>
              <SectionHeading>Errors ({errors.length})</SectionHeading>
              <ProblemList problems={errors} />
            </>
          )}
          {warnings.length > 0 && (
            <>
              <SectionHeading>Warnings ({warnings.length})</SectionHeading>
              <ProblemList problems={warnings} />
            </>
          )}
          {unrated.length > 0 && (
            <>
              <SectionHeading>Unrated ({unrated.length})</SectionHeading>
              <ProblemList problems={unrated} />
            </>
          )}
          {multiplePerformances.length > 0 && (
            <>
              <SectionHeading>
                More than two performances on same day (
                {multiplePerformances.length})
              </SectionHeading>
              <ProblemList problems={multiplePerformances} />
            </>
          )}
          {groupByRating(unconsidered).map(({ rating, problems: group }) => (
            <Fragment key={rating}>
              <SectionHeading>
                Unconsidered Scotsman reviews: {rating} stars
              </SectionHeading>
              <ProblemList problems={group} />
            </Fragment>
          ))}
        </>
      )}
    </Wrapper>
  );
}
