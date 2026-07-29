import { YAMLParseError } from "yaml";

function lineText(source: string, line: number): string {
  const text = source.split(/\r\n|\r|\n/)[line - 1]?.trim() ?? "";
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

/** Turn a YAML parse error into something a non-technical editor of the file
 * can act on, rather than the parser's internal terminology. */
export function describeYamlError(err: unknown, source: string): string {
  if (err instanceof YAMLParseError) {
    const line = err.linePos?.[0].line;
    const where = line !== undefined ? ` near line ${String(line)}` : "";
    const excerpt = line !== undefined ? lineText(source, line) : "";
    const quoted = excerpt ? `: "${excerpt}"` : "";
    if (err.code === "DUPLICATE_KEY") {
      return `duplicate key found${where}${quoted}`;
    }
    return `unexpected text found${where}${quoted}`;
  }
  return err instanceof Error ? err.message : String(err);
}
