import { describe, expect, it } from "vitest";
import { edfringeShowUrl } from "./edfringe-url";

describe("edfringeShowUrl", () => {
  it.each([
    ["Cathy", "cathy"],
    ["1 Dazzling Cabaret", "1-dazzling-cabaret"],
    [
      "1 King, 2 Princes and Shakespeare's Lie",
      "1-king-2-princes-and-shakespeare-s-lie",
    ],
    ["1954: Ella, Etta, Eartha", "1954-ella-etta-eartha"],
    ["A-List Burlesque and Cabaret", "a-list-burlesque-and-cabaret"],
    ["Amy – Tears Dry on Their Own", "amy-tears-dry-on-their-own"],
    ["Simon & Garfunkel and Beyond", "simon-garfunkel-and-beyond"],
    ["Dune! The Musical", "dune-the-musical"],
    ["...Earnest?", "earnest"],
    ["Witch? Women on Trial", "witch-women-on-trial"],
    [
      "Caspar Thomas: The Art of Close-Up Magic (Volume 2)",
      "caspar-thomas-the-art-of-close-up-magic-volume-2",
    ],
    [
      "THIS IS NOT AMERICA: A Razor-Edge New Play To Start Your Day!",
      "this-is-not-america-a-razor-edge-new-play-to-start-your-day",
    ],
  ])("maps %s to the %s id", (title, id) => {
    expect(edfringeShowUrl(title)).toBe(
      `https://www.edfringe.com/tickets/whats-on/${id}`,
    );
  });
});
