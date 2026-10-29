export function longestBacktickRun(value: string): number {
  let longest = 0;
  for (const match of value.matchAll(/`+/gu)) {
    longest = Math.max(longest, match[0].length);
  }
  return longest;
}

export function inlineCodeAffixes(value: string): { prefix: string; suffix: string } {
  const delimiter = "`".repeat(longestBacktickRun(value) + 1);
  const isOnlySpaces = /^ +$/u.test(value);
  const needsPadding = value.length > 0 && (
    value.startsWith("`")
    || value.endsWith("`")
    || (!isOnlySpaces && value.startsWith(" ") && value.endsWith(" "))
  );
  const padding = needsPadding ? " " : "";
  return {
    prefix: delimiter + padding,
    suffix: padding + delimiter,
  };
}

export function inlineCodeMarkdown(value: string): string {
  const { prefix, suffix } = inlineCodeAffixes(value);
  return prefix + value + suffix;
}

