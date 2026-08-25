import { afterEach, describe, expect, it, vi } from "vitest";
import { loadFavourites } from "./load-favourites";

const A_SHOW_YAML = `
a-show:
  title: A Show
  venue: A Venue
  duration: "1:00"
  startTime: "20:00"
  url: https://example.com/a-show
  rating: 1
  dates: [10]
`;

function mockFetch(
  responses: Record<string, string | { status: number }>,
): void {
  const responsesByFileName = new Map(Object.entries(responses));
  vi.stubGlobal(
    "fetch",
    (input: string | URL): Promise<Response> => {
      const url = String(input);
      const fileName = url.split("/").pop() ?? "";
      const response = responsesByFileName.get(fileName);
      if (response === undefined) {
        throw new Error(`mockFetch: unexpected fetch of "${url}"`);
      }
      if (typeof response === "string") {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          text: () => Promise.resolve(response),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: response.status,
        statusText: "Error",
        text: () => Promise.resolve(""),
      } as Response);
    },
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadFavourites", () => {
  it("loads shows from shows.yaml with no problems", async () => {
    mockFetch({
      "shows.yaml": A_SHOW_YAML,
      "scotsman-fringe-reviews.yaml": "[]",
    });

    const { shows, problems } = await loadFavourites();

    expect(shows).toHaveLength(1);
    expect(shows[0].title).toBe("A Show");
    expect(problems).toHaveLength(0);
  });

  it("rejects when shows.yaml fails to load", async () => {
    mockFetch({
      "shows.yaml": { status: 500 },
      "scotsman-fringe-reviews.yaml": "[]",
    });

    await expect(loadFavourites()).rejects.toThrow("Could not load shows.yaml");
  });

  it("reports a warning, not a fatal error, when scotsman-fringe-reviews.yaml fails to load", async () => {
    mockFetch({
      "shows.yaml": A_SHOW_YAML,
      "scotsman-fringe-reviews.yaml": { status: 404 },
    });

    const { shows, problems } = await loadFavourites();

    expect(shows).toHaveLength(1);
    expect(
      problems.some((p) =>
        p.message.includes("Could not load scotsman-fringe-reviews.yaml"),
      ),
    ).toBe(true);
  });
});
