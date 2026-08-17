/** Guesses a show's edfringe.com page from its title, using the same
 * id-from-title convention edfringe.com itself uses (verified against
 * every show currently in shows.yaml): lowercase, each run of
 * non-alphanumeric characters becomes a single hyphen, and leading/
 * trailing hyphens are trimmed. This is a guess, not a validated lookup -
 * it can be wrong for a show whose edfringe.com id doesn't follow the
 * pattern, or for a show that isn't on edfringe.com at all. */
export function edfringeShowUrl(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `https://www.edfringe.com/tickets/whats-on/${slug}`;
}
