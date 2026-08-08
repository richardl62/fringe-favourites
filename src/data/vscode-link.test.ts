import { afterEach, describe, expect, it, vi } from "vitest";
import { showsYamlEditLink, showsYamlPathWarning } from "./vscode-link";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("showsYamlEditLink", () => {
  it("builds a vscode:// link when VITE_SHOWS_YAML_PATH is set", () => {
    vi.stubEnv("VITE_SHOWS_YAML_PATH", "/repo/public/shows.yaml");

    expect(showsYamlEditLink(42)).toBe(
      "vscode://file//repo/public/shows.yaml:42:1",
    );
  });

  it("returns undefined when VITE_SHOWS_YAML_PATH is unset", () => {
    vi.stubEnv("VITE_SHOWS_YAML_PATH", "");

    expect(showsYamlEditLink(42)).toBeUndefined();
  });
});

describe("showsYamlPathWarning", () => {
  it("warns in dev mode when VITE_SHOWS_YAML_PATH is unset", () => {
    vi.stubEnv("VITE_SHOWS_YAML_PATH", "");
    vi.stubEnv("DEV", true);

    expect(showsYamlPathWarning()).toEqual({
      severity: "warning",
      message:
        "VITE_SHOWS_YAML_PATH isn't set in .env.local, so edit links to shows.yaml won't appear on this page.",
      link: undefined,
      editLink: undefined,
    });
  });

  it("stays silent when VITE_SHOWS_YAML_PATH is set", () => {
    vi.stubEnv("VITE_SHOWS_YAML_PATH", "/repo/public/shows.yaml");
    vi.stubEnv("DEV", true);

    expect(showsYamlPathWarning()).toBeUndefined();
  });

  it("stays silent outside dev mode even when unset", () => {
    vi.stubEnv("VITE_SHOWS_YAML_PATH", "");
    vi.stubEnv("DEV", false);

    expect(showsYamlPathWarning()).toBeUndefined();
  });
});
