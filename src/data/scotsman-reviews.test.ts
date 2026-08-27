import { afterEach, describe, expect, it, vi } from "vitest";
import { scotsmanReviewProblems } from "./scotsman-reviews";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("scotsmanReviewProblems", () => {
  it("reports a 'considered: no' show as an unconsidered problem", () => {
    vi.stubEnv("VITE_SCOTSMAN_REVIEWS_YAML_PATH", "");

    const problems = scotsmanReviewProblems(`
- title: A Show
  rating: 5
  considered: no
  reviewUrl: https://example.com/a-show
  guessedShowUrl: https://www.edfringe.com/tickets/whats-on/a-show
`);

    expect(problems).toEqual([
      {
        severity: "unconsidered",
        message: "",
        link: { title: "A Show", url: "https://example.com/a-show" },
        editLink: undefined,
        rating: 5,
        sourceUrl: "https://www.edfringe.com/tickets/whats-on/a-show",
      },
    ]);
  });

  it("leaves sourceUrl undefined when guessedShowUrl isn't set", () => {
    const problems = scotsmanReviewProblems(`
- title: A Show
  rating: 5
  considered: no
  reviewUrl: https://example.com/a-show
`);

    expect(problems[0]).toMatchObject({ sourceUrl: undefined });
  });

  it("doesn't report a 'considered: yes' show", () => {
    const problems = scotsmanReviewProblems(`
- title: A Show
  rating: 5
  considered: yes
  reviewUrl: https://example.com/a-show
`);

    expect(problems).toHaveLength(0);
  });

  it("builds an edit link to the entry's line when the env var is set", () => {
    vi.stubEnv(
      "VITE_SCOTSMAN_REVIEWS_YAML_PATH",
      "/repo/public/scotsman-fringe-reviews.yaml",
    );

    const problems = scotsmanReviewProblems(`
- title: First Show
  rating: 4
  considered: no
  reviewUrl: https://example.com/first

- title: Second Show
  rating: 5
  considered: no
  reviewUrl: https://example.com/second
`);

    expect(problems[0].editLink).toBe(
      "vscode://file//repo/public/scotsman-fringe-reviews.yaml:2:1",
    );
    expect(problems[1].editLink).toBe(
      "vscode://file//repo/public/scotsman-fringe-reviews.yaml:7:1",
    );
  });

  it("rejects an unknown field", () => {
    const problems = scotsmanReviewProblems(`
- title: A Show
  rating: 5
  considered: no
  reviewUrl: https://example.com/a-show
  nonsense: true
`);

    expect(
      problems.some(
        (p) =>
          p.severity === "error" &&
          p.message.includes("unknown field(s): nonsense"),
      ),
    ).toBe(true);
  });

  it("rejects an invalid 'considered' value", () => {
    const problems = scotsmanReviewProblems(`
- title: A Show
  rating: 5
  considered: maybe
  reviewUrl: https://example.com/a-show
`);

    expect(
      problems.some(
        (p) =>
          p.severity === "error" &&
          p.message.includes('"considered" should be "yes" or "no"'),
      ),
    ).toBe(true);
  });

  it("reports a top-level YAML syntax error without throwing", () => {
    const problems = scotsmanReviewProblems(`
- title: [this is not valid
`);

    expect(
      problems.some(
        (p) =>
          p.severity === "error" &&
          p.message.includes("scotsman-fringe-reviews.yaml:"),
      ),
    ).toBe(true);
  });

  it("reports content that isn't a list", () => {
    const problems = scotsmanReviewProblems(`
title: A Show
`);

    expect(
      problems.some(
        (p) =>
          p.severity === "error" &&
          p.message.includes("should contain a list of shows"),
      ),
    ).toBe(true);
  });
});
