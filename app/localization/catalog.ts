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
    forumTagline: message("forumTagline", "Questions, discussions, and practical answers", "Forum header tagline."),
    signInGoogle: message("signInGoogle", "Sign in with Google", "Google sign-in button in the forum header.", [], ["Google"]),
    signOut: message("signOut", "Sign out", "Sign-out button in the forum header."),
    authPending: message("authPending", "Please wait…", "Pending label while an authentication request is running."),
    authError: message("authError", "Authentication failed. Please try again.", "Safe error shown when an authentication request fails."),
    forumIndex: message("forumIndex", "Forum index", "Link and eyebrow for the forum index."),
    categoriesHeading: message("categoriesHeading", "Categories", "Heading above the public category list."),
    categoriesIntro: message("categoriesIntro", "Browse the forum by category and section.", "Introduction to the forum index."),
    categoriesEmpty: message("categoriesEmpty", "There are no categories yet.", "Empty category list message."),
    sectionsEmpty: message("sectionsEmpty", "There are no sections in this category yet.", "Empty section list message."),
    topicsEmpty: message("topicsEmpty", "There are no topics in this section yet.", "Empty topic list message."),
    postsEmpty: message("postsEmpty", "There are no messages in this topic yet.", "Empty post list message."),
    breadcrumbsLabel: message("breadcrumbsLabel", "Breadcrumbs", "Accessible label for forum breadcrumbs."),
    categoryLabel: message("categoryLabel", "Category", "Category page type label."),
    sectionLabel: message("sectionLabel", "Section", "Section page type label."),
    topicLabel: message("topicLabel", "Topic", "Topic page type label."),
    topicsHeading: message("topicsHeading", "Topics", "Accessible heading for the topic table."),
    topicColumn: message("topicColumn", "Topic", "Topic table title column."),
    postsColumn: message("postsColumn", "Messages", "Topic table message-count column."),
    sectionCount: message("sectionCount", "{{count}} section(s)", "Number of sections in a category.", ["count"]),
    topicAndPostCount: message("topicAndPostCount", "{{topics}} topic(s) · {{posts}} message(s)", "Topic and message totals for a section.", ["topics", "posts"]),
    startedBy: message("startedBy", "Started by {{author}}", "Name of the topic author.", ["author"]),
    postNumber: message("postNumber", "Message #{{number}}", "Sequential message number.", ["number"]),
    forumNotFoundHeading: message("forumNotFoundHeading", "Forum page not found", "Forum not-found heading."),
    forumNotFoundBody: message("forumNotFoundBody", "The category, section, or topic does not exist.", "Forum not-found explanation."),
    forumErrorHeading: message("forumErrorHeading", "The forum could not be loaded", "Forum read error heading."),
    forumErrorBody: message("forumErrorBody", "Please try again later.", "Forum read error explanation."),
    createTopicHeading: message("createTopicHeading", "Create a new topic", "Heading above the authenticated topic form."),
    topicTitleLabel: message("topicTitleLabel", "Topic title", "Label for a new topic title."),
    initialPostLabel: message("initialPostLabel", "First message", "Label for a new topic's first message."),
    createTopicSubmit: message("createTopicSubmit", "Create topic", "Submit button for a new topic."),
    replyHeading: message("replyHeading", "Add a reply", "Heading above the authenticated reply form."),
    replyBodyLabel: message("replyBodyLabel", "Reply", "Label for a reply body."),
    replySubmit: message("replySubmit", "Post reply", "Submit button for a reply."),
    forumWriteError_invalid: message("forumWriteError_invalid", "Enter all required fields.", "Forum mutation validation error."),
    forumWriteError_unauthenticated: message("forumWriteError_unauthenticated", "Sign in to post.", "Forum mutation authentication error."),
    forumWriteError_origin: message("forumWriteError_origin", "This request could not be verified.", "Forum mutation origin error."),
    forumWriteError_notFound: message("forumWriteError_notFound", "The target section or topic no longer exists.", "Forum mutation missing target error."),
    forumWriteError_rateLimited: message("forumWriteError_rateLimited", "Please wait a few seconds before posting again.", "Forum mutation rate limit error."),
    forumWriteError_unavailable: message("forumWriteError_unavailable", "Your message could not be saved. Please try again.", "Forum mutation storage error."),
  },
} as const satisfies Record<string, Record<string, UiMessageDescriptor>>;

function message<const Key extends string, const Source extends string>(
  key: Key,
  source: Source,
  description: string,
  placeholders: readonly string[] = [],
  protectedTerms: readonly string[] = [],
) {
  return {
    namespace: "common",
    key,
    source,
    description,
    placeholders,
    messageKind: placeholders.length === 0 ? "plain" : "interpolation",
    protectedTerms,
  } as const satisfies UiMessageDescriptor;
}

export type UiNamespace = keyof typeof canonicalEnglishCatalog;
export type UiKey<N extends UiNamespace> = keyof (typeof canonicalEnglishCatalog)[N] & string;
type DescriptorSource<T> = T extends { readonly source: infer Source extends string } ? Source : never;
export type CanonicalResourceShape = {
  [N in UiNamespace]: {
    [K in UiKey<N>]: DescriptorSource<(typeof canonicalEnglishCatalog)[N][K]>;
  };
};

export function catalogDescriptors(): UiMessageDescriptor[] {
  return Object.values(canonicalEnglishCatalog).flatMap((namespace) =>
    Object.values(namespace) as UiMessageDescriptor[],
  );
}
