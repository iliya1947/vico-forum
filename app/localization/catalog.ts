export const messageKinds = ["plain", "interpolation", "plural", "contextual/select", "rich"] as const;

export type MessageKind = (typeof messageKinds)[number];

export interface UiMessageDescriptor {
  namespace: string;
  key: string;
  source: string;
  description: string;
  placeholders: readonly string[];
  messageKind: MessageKind;
  protectedTerms: readonly string[];
}

export const canonicalEnglishCatalog = {
  common: {
    productName: {
      namespace: "common",
      key: "productName",
      source: "Vico Forum",
      description: "The product name shown above the page heading.",
      placeholders: [],
      messageKind: "plain",
      protectedTerms: ["Vico Forum"],
    },
    heading: {
      namespace: "common",
      key: "heading",
      source: "Translation foundation",
      description: "Heading of the Stage 1 landing page.",
      placeholders: [],
      messageKind: "plain",
      protectedTerms: [],
    },
    stageSummary: {
      namespace: "common",
      key: "stageSummary",
      source: "Stage 1 establishes locale-aware routing and synchronized UI translation.",
      description: "Short description of the completed Stage 1 foundation.",
      placeholders: [],
      messageKind: "plain",
      protectedTerms: ["Stage 1"],
    },
  },
} as const satisfies Record<string, Record<string, UiMessageDescriptor>>;

export type UiNamespace = keyof typeof canonicalEnglishCatalog;
export type UiKey<N extends UiNamespace> = keyof (typeof canonicalEnglishCatalog)[N] & string;

export function catalogDescriptors(): UiMessageDescriptor[] {
  return Object.values(canonicalEnglishCatalog).flatMap((namespace) =>
    Object.values(namespace) as UiMessageDescriptor[],
  );
}

