import { fromMarkdown } from "mdast-util-from-markdown";
import { toMarkdown } from "mdast-util-to-markdown";

export const CONTENT_MARKDOWN_PROTECTION_POLICY_VERSION = "cnt04-commonmark-v1";
export const BASE_TRANSLATED_MARKDOWN_SEGMENT_CHARACTER_LIMIT = 20_000;

export type MarkdownTranslationValidationCode =
  | "invalid-segment-set"
  | "invalid-segment-value"
  | "protected-token-mismatch"
  | "protected-structure-mismatch";

export class MarkdownTranslationValidationError extends Error {
  readonly disposition = "original-fallback" as const;

  constructor(readonly code: MarkdownTranslationValidationCode, message: string) {
    super(message);
    this.name = "MarkdownTranslationValidationError";
  }
}

export interface MarkdownTranslationSegment {
  readonly id: string;
  readonly text: string;
}

export interface MarkdownSegmentTranslation {
  readonly id: string;
  readonly value: string;
}

interface MarkdownNode {
  type: string;
  children?: MarkdownNode[];
  value?: string;
  [key: string]: unknown;
}

interface ProtectedToken {
  readonly marker: string;
  readonly value: string;
}

interface SegmentRecord {
  readonly id: string;
  readonly marker: string;
  readonly protectedTokens: readonly ProtectedToken[];
  readonly maxTranslatedCharacters: number;
  readonly canonicalPath: string;
}

interface TechnicalSpan {
  readonly start: number;
  readonly end: number;
}

const HUMAN_LANGUAGE_LETTER = /\p{L}/u;

const CLI_OPTION_PATTERN = /--?[A-Za-z][A-Za-z0-9-]*/gu;

const TECHNICAL_PATTERNS = [
  /https?:\/\/[^\s<>"'`]+/gu,
  /mailto:[^\s<>"'`]+/gu,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/gu,
  /@[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+/gu,
  /\b[A-Za-z]:\\(?:[^\\\s]+\\)*[^\\\s]+/gu,
  /(?:\.{1,2}\/|\/)[A-Za-z0-9._~!$&'()*+,;=:@%/-]+/gu,
  /\b[A-Za-z_$][A-Za-z0-9_$]*(?:[.:/\\][A-Za-z0-9_$@%+~#-]+)+\b/gu,
  /\b[A-Za-z_$][A-Za-z0-9_$]*\(\)/gu,
  /\b[A-Za-z][A-Za-z0-9]*(?:\+\+|#)(?=\s|$|[.,;:!?])/gu,
  /\b(?:[a-z]+[A-Z][A-Za-z0-9_$]*|[A-Z][A-Za-z0-9_$]*[a-z][A-Za-z0-9_$]*[A-Z][A-Za-z0-9_$]*|[A-Za-z0-9]+_[A-Za-z0-9_]+|[A-Z][A-Z0-9_]{2,}|v?\d+(?:\.\d+){1,3}(?:-[A-Za-z0-9.-]+)?)\b/gu,
] as const;

export class ProtectedMarkdownTranslationDocument {
  readonly protectedMarkdown: string;
  readonly segments: readonly MarkdownTranslationSegment[];

  private constructor(
    protectedMarkdown: string,
    segments: readonly MarkdownTranslationSegment[],
    private readonly records: readonly SegmentRecord[],
    private readonly expectedStructure: string,
    private readonly segmentMarkerNamespace: string,
    private readonly tokenMarkerNamespace: string,
  ) {
    this.protectedMarkdown = protectedMarkdown;
    this.segments = segments;
  }

  static create(sourceMarkdown: string): ProtectedMarkdownTranslationDocument {
    if (typeof sourceMarkdown !== "string") {
      throw new TypeError("Markdown source must be a string");
    }

    const namespaceSalt = chooseNamespaceSalt(sourceMarkdown);
    const segmentMarkerNamespace = `VICOSEGMENT${namespaceSalt}X`;
    const tokenMarkerNamespace = `⟦VICOPROTECTED${namespaceSalt}X`;
    const tree = parseMarkdown(sourceMarkdown);
    const recordsWithoutPaths: Array<Omit<SegmentRecord, "canonicalPath">> = [];
    const segments: MarkdownTranslationSegment[] = [];

    walk(tree, "root", (node, path) => {
      if (node.type !== "text" || typeof node.value !== "string") return;

      const protectedResult = protectTechnicalFragments(
        node.value,
        tokenMarkerNamespace,
        recordsWithoutPaths.length,
      );
      if (!HUMAN_LANGUAGE_LETTER.test(protectedResult.humanText)) return;

      const id = `segment:${path}`;
      const marker = `${segmentMarkerNamespace}${recordsWithoutPaths.length}END`;
      segments.push({ id, text: protectedResult.text });
      recordsWithoutPaths.push({
        id,
        marker,
        protectedTokens: protectedResult.tokens,
        maxTranslatedCharacters: Math.max(
          BASE_TRANSLATED_MARKDOWN_SEGMENT_CHARACTER_LIMIT,
          protectedResult.text.length,
        ),
      });
      node.value = marker;
    });

    const protectedMarkdown = serializeMarkdown(tree);
    const canonicalTree = parseMarkdown(protectedMarkdown);
    const markerPaths = locateSegmentMarkers(
      canonicalTree,
      recordsWithoutPaths.map((record) => record.marker),
    );

    const records: SegmentRecord[] = recordsWithoutPaths.map((record) => {
      const canonicalPath = markerPaths.get(record.marker);
      if (!canonicalPath) {
        throw new MarkdownTranslationValidationError(
          "protected-structure-mismatch",
          "Protected Markdown serialization lost a translation segment marker",
        );
      }
      return { ...record, canonicalPath };
    });

    const segmentPaths = new Set(records.map((record) => record.canonicalPath));
    const expectedStructure = structureSignature(canonicalTree, segmentPaths);

    return new ProtectedMarkdownTranslationDocument(
      protectedMarkdown,
      Object.freeze(segments.map((segment) => Object.freeze({ ...segment }))),
      Object.freeze(records.map((record) => Object.freeze({
        ...record,
        protectedTokens: Object.freeze(record.protectedTokens.map((token) => Object.freeze({ ...token }))),
      }))),
      expectedStructure,
      segmentMarkerNamespace,
      tokenMarkerNamespace,
    );
  }

  restore(translations: readonly MarkdownSegmentTranslation[]): string {
    const values = validateTranslationSet(
      this.records,
      translations,
      this.segmentMarkerNamespace,
      this.tokenMarkerNamespace,
    );
    const tree = parseMarkdown(this.protectedMarkdown);
    const byMarker = new Map(this.records.map((record) => [record.marker, record]));
    const restoredMarkers = new Set<string>();

    walk(tree, "root", (node) => {
      if (node.type !== "text" || typeof node.value !== "string") return;
      const record = byMarker.get(node.value);
      if (!record) return;

      const translated = values.get(record.id);
      if (translated === undefined) {
        throw new MarkdownTranslationValidationError(
          "invalid-segment-set",
          `Missing translation for ${record.id}`,
        );
      }
      node.value = restoreProtectedTokens(record, translated, this.tokenMarkerNamespace);
      restoredMarkers.add(record.marker);
    });

    if (restoredMarkers.size !== this.records.length) {
      throw new MarkdownTranslationValidationError(
        "protected-structure-mismatch",
        "Protected Markdown document no longer contains the expected segment markers",
      );
    }

    const restoredMarkdown = serializeMarkdown(tree);
    const reparsed = parseMarkdown(restoredMarkdown);
    const segmentPaths = new Set(this.records.map((record) => record.canonicalPath));
    if (structureSignature(reparsed, segmentPaths) !== this.expectedStructure) {
      throw new MarkdownTranslationValidationError(
        "protected-structure-mismatch",
        "Translated text changed protected Markdown structure",
      );
    }

    return restoredMarkdown;
  }
}

export function protectMarkdownForTranslation(
  sourceMarkdown: string,
): ProtectedMarkdownTranslationDocument {
  return ProtectedMarkdownTranslationDocument.create(sourceMarkdown);
}

export function countMarkdownTranslationSemanticCharacters(sourceMarkdown: string): number {
  const protectedDocument = protectMarkdownForTranslation(sourceMarkdown);
  let semanticCharacters = 0;
  for (const segment of protectedDocument.segments) {
    semanticCharacters += segment.text.length;
    if (!Number.isSafeInteger(semanticCharacters)) {
      throw new TypeError("post-body semantic character count is invalid");
    }
  }
  return semanticCharacters;
}

export function extractPlainSemanticTextForSourceLocaleDetection(value: string): string {
  if (typeof value !== "string") {
    throw new TypeError("Plain source-locale detection text must be a string");
  }
  return normalizeSourceLocaleDetectionText(humanTextOutsideTechnicalSpans(
    value,
    technicalSpans(value),
  ));
}

export function extractMarkdownSemanticTextForSourceLocaleDetection(
  sourceMarkdown: string,
): string {
  if (typeof sourceMarkdown !== "string") {
    throw new TypeError("Markdown source-locale detection text must be a string");
  }

  const tree = parseMarkdown(sourceMarkdown);
  const semanticParts: string[] = [];
  walk(tree, "root", (node) => {
    if (node.type !== "text" || typeof node.value !== "string") return;
    const humanText = humanTextOutsideTechnicalSpans(
      node.value,
      technicalSpans(node.value),
    );
    if (HUMAN_LANGUAGE_LETTER.test(humanText)) semanticParts.push(humanText);
  });

  return normalizeSourceLocaleDetectionText(semanticParts.join(" "));
}

function validateTranslationSet(
  records: readonly SegmentRecord[],
  translations: readonly MarkdownSegmentTranslation[],
  segmentMarkerNamespace: string,
  tokenMarkerNamespace: string,
): ReadonlyMap<string, string> {
  if (!Array.isArray(translations)) {
    throw new MarkdownTranslationValidationError(
      "invalid-segment-set",
      "Markdown segment translations must be an array",
    );
  }

  const recordsById = new Map(records.map((record) => [record.id, record]));
  const values = new Map<string, string>();

  for (const translation of translations) {
    if (
      !translation
      || typeof translation.id !== "string"
      || typeof translation.value !== "string"
      || values.has(translation.id)
      || !recordsById.has(translation.id)
    ) {
      throw new MarkdownTranslationValidationError(
        "invalid-segment-set",
        "Markdown segment translation IDs must exactly match the protected document",
      );
    }
    const record = recordsById.get(translation.id);
    if (!record) {
      throw new MarkdownTranslationValidationError(
        "invalid-segment-set",
        "Markdown segment translation IDs must exactly match the protected document",
      );
    }
    if (
      !translation.value.trim()
      || translation.value.length > record.maxTranslatedCharacters
      || hasForbiddenControlCharacters(translation.value)
      || translation.value.includes(segmentMarkerNamespace)
    ) {
      throw new MarkdownTranslationValidationError(
        "invalid-segment-value",
        `Translation value for ${translation.id} is not a bounded plain string`,
      );
    }
    if (
      translation.value.includes(tokenMarkerNamespace)
      && !tokenSequenceMatches(record, translation.value, tokenMarkerNamespace)
    ) {
      throw new MarkdownTranslationValidationError(
        "protected-token-mismatch",
        `Translation value for ${translation.id} changed protected technical tokens`,
      );
    }
    values.set(translation.id, translation.value);
  }

  if (values.size !== records.length) {
    throw new MarkdownTranslationValidationError(
      "invalid-segment-set",
      "Markdown segment translation IDs must exactly match the protected document",
    );
  }

  return values;
}

function restoreProtectedTokens(
  record: SegmentRecord,
  translated: string,
  tokenMarkerNamespace: string,
): string {
  if (!tokenSequenceMatches(record, translated, tokenMarkerNamespace)) {
    throw new MarkdownTranslationValidationError(
      "protected-token-mismatch",
      `Translation value for ${record.id} changed protected technical tokens`,
    );
  }

  let restored = translated;
  for (const token of record.protectedTokens) {
    restored = restored.replace(token.marker, token.value);
  }
  return restored;
}

function tokenSequenceMatches(
  record: SegmentRecord,
  translated: string,
  tokenMarkerNamespace: string,
): boolean {
  const expected = record.protectedTokens.map((token) => token.marker);
  const observed = translated.match(
    new RegExp(`${escapeRegExp(tokenMarkerNamespace)}\\d+X\\d+⟧`, "gu"),
  ) ?? [];

  if (
    observed.length !== expected.length
    || observed.some((marker, index) => marker !== expected[index])
  ) {
    return false;
  }

  let remainder = translated;
  for (const marker of observed) remainder = remainder.replace(marker, "");
  return !remainder.includes(tokenMarkerNamespace);
}

function hasForbiddenControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (
      code <= 0x08
      || code === 0x0b
      || code === 0x0c
      || (code >= 0x0e && code <= 0x1f)
      || code === 0x7f
    ) {
      return true;
    }
  }
  return false;
}

function protectTechnicalFragments(
  value: string,
  tokenMarkerNamespace: string,
  segmentIndex: number,
): {
  readonly text: string;
  readonly humanText: string;
  readonly tokens: readonly ProtectedToken[];
} {
  const spans = technicalSpans(value);
  if (spans.length === 0) {
    return { text: value, humanText: value, tokens: [] };
  }

  const tokens: ProtectedToken[] = [];
  const pieces: string[] = [];
  let cursor = 0;

  spans.forEach((span, tokenIndex) => {
    const marker = `${tokenMarkerNamespace}${segmentIndex}X${tokenIndex}⟧`;
    pieces.push(value.slice(cursor, span.start), marker);
    tokens.push({ marker, value: value.slice(span.start, span.end) });
    cursor = span.end;
  });
  pieces.push(value.slice(cursor));

  return {
    text: pieces.join(""),
    humanText: humanTextOutsideTechnicalSpans(value, spans),
    tokens,
  };
}

function humanTextOutsideTechnicalSpans(
  value: string,
  spans: readonly TechnicalSpan[],
): string {
  if (spans.length === 0) return value;

  const pieces: string[] = [];
  let cursor = 0;
  for (const span of spans) {
    pieces.push(value.slice(cursor, span.start), " ");
    cursor = span.end;
  }
  pieces.push(value.slice(cursor));
  return pieces.join("");
}

function normalizeSourceLocaleDetectionText(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function technicalSpans(value: string): readonly TechnicalSpan[] {
  const candidates: TechnicalSpan[] = [];

  for (const pattern of TECHNICAL_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of value.matchAll(pattern)) {
      if (match.index === undefined || !match[0]) continue;
      let matched = match[0];
      if (/^(?:https?:\/\/|mailto:)/u.test(matched)) {
        matched = matched.replace(/[.,;:!?]+$/u, "");
      }
      if (!matched) continue;
      candidates.push({
        start: match.index,
        end: match.index + matched.length,
      });
    }
  }

  CLI_OPTION_PATTERN.lastIndex = 0;
  for (const match of value.matchAll(CLI_OPTION_PATTERN)) {
    if (
      match.index === undefined
      || !match[0]
      || !hasCliOptionBoundary(value, match.index)
    ) {
      continue;
    }
    candidates.push({
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  candidates.sort((left, right) =>
    left.start - right.start
    || (right.end - right.start) - (left.end - left.start)
  );

  const selected: TechnicalSpan[] = [];
  let cursor = -1;
  for (const candidate of candidates) {
    if (candidate.start < cursor) continue;
    selected.push(candidate);
    cursor = candidate.end;
  }
  return selected;
}

function hasCliOptionBoundary(value: string, optionStart: number): boolean {
  if (optionStart === 0) return true;
  const previous = Array.from(value.slice(0, optionStart)).at(-1);
  return previous === undefined || !/[\p{L}\p{N}\p{M}_-]/u.test(previous);
}

function chooseNamespaceSalt(sourceMarkdown: string): number {
  for (let salt = 0; salt < Number.MAX_SAFE_INTEGER; salt++) {
    if (
      !sourceMarkdown.includes(`VICOSEGMENT${salt}X`)
      && !sourceMarkdown.includes(`⟦VICOPROTECTED${salt}X`)
    ) {
      return salt;
    }
  }
  throw new MarkdownTranslationValidationError(
    "protected-structure-mismatch",
    "Unable to allocate a collision-free Markdown protection namespace",
  );
}

function locateSegmentMarkers(
  tree: MarkdownNode,
  markers: readonly string[],
): ReadonlyMap<string, string> {
  const expected = new Set(markers);
  const located = new Map<string, string>();

  walk(tree, "root", (node, path) => {
    if (node.type !== "text" || typeof node.value !== "string" || !expected.has(node.value)) return;
    if (located.has(node.value)) {
      throw new MarkdownTranslationValidationError(
        "protected-structure-mismatch",
        "Protected Markdown serialization duplicated a translation segment marker",
      );
    }
    located.set(node.value, path);
  });

  if (located.size !== markers.length) {
    throw new MarkdownTranslationValidationError(
      "protected-structure-mismatch",
      "Protected Markdown serialization changed translation segment markers",
    );
  }
  return located;
}

function structureSignature(tree: MarkdownNode, translatedPaths: ReadonlySet<string>): string {
  function normalize(node: MarkdownNode, path: string): unknown {
    const metadata: Record<string, unknown> = {};
    for (const key of Object.keys(node).sort()) {
      if (key === "children" || key === "position") continue;
      if (key === "value" && node.type === "text" && translatedPaths.has(path)) {
        metadata.value = "<translated-text>";
        continue;
      }
      metadata[key] = node[key];
    }

    return {
      metadata,
      children: (node.children ?? []).map((child, index) =>
        normalize(child, childPath(path, child.type, index))
      ),
    };
  }

  return JSON.stringify(normalize(tree, "root"));
}

function walk(
  node: MarkdownNode,
  path: string,
  visitor: (node: MarkdownNode, path: string) => void,
): void {
  visitor(node, path);
  for (const [index, child] of (node.children ?? []).entries()) {
    walk(child, childPath(path, child.type, index), visitor);
  }
}

function childPath(parentPath: string, type: string, index: number): string {
  return `${parentPath}/${type}[${index}]`;
}

function parseMarkdown(value: string): MarkdownNode {
  return fromMarkdown(value) as unknown as MarkdownNode;
}

function serializeMarkdown(tree: MarkdownNode): string {
  return toMarkdown(tree as Parameters<typeof toMarkdown>[0]);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
