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

export function ProblemsView({ problems }: { problems: Problem[] }) {
  return (
    <Wrapper>
      <p>
        <a href="#">Back to shows</a>
      </p>
      <h1>Problems ({problems.length})</h1>
      {problems.length === 0 ? (
        <div>No problems found.</div>
      ) : (
        problems.map((problem, index) => (
          <ProblemRow key={index} $severity={problem.severity}>
            [{problem.severity}] {problem.message}
          </ProblemRow>
        ))
      )}
    </Wrapper>
  );
}
