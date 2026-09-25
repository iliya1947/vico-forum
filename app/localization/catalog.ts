export const messageKinds = ["plain", "interpolation", "plural", "contextual/select", "rich"] as const;

export type MessageKind = (typeof messageKinds)[number];
export type UiStructuredMessageSource = Readonly<Record<string, string>>;
export type UiMessageSource = string | UiStructuredMessageSource;

export interface UiMessageDescriptor {
  namespace: string;
  key: string;
  source: UiMessageSource;
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
    sectionCount: pluralMessage(
      "sectionCount",
      { one: "{{count}} section", other: "{{count}} sections" },
      "Number of sections in a category.",
      ["count"],
    ),
    topicCount: pluralMessage(
      "topicCount",
      { one: "{{count}} topic", other: "{{count}} topics" },
      "Number of topics in a section.",
      ["count"],
    ),
    messageCount: pluralMessage(
      "messageCount",
      { one: "{{count}} message", other: "{{count}} messages" },
      "Number of messages in a section.",
      ["count"],
    ),
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
    solved: message("solved", "Solved", "Solved topic status."),
    markSolved: message("markSolved", "Mark as solved", "Action for the topic author to mark a topic solved."),
    bestAnswer: message("bestAnswer", "Best answer", "Label on the selected best answer."),
    selectBestAnswer: message("selectBestAnswer", "Select as best answer", "Action for the topic author to select a post."),
    goToSolution: message("goToSolution", "Go to solution", "Link from the topic heading to the best answer."),
    sourceLocaleCurrent: message("sourceLocaleCurrent", "Source language: {{locale}}", "Current source-language metadata for forum content.", ["locale"]),
    sourceLocaleCorrectionInput: message("sourceLocaleCorrectionInput", "Correct source language", "Label for the source-language correction input."),
    sourceLocaleCorrectionSubmit: message("sourceLocaleCorrectionSubmit", "Correct language", "Submit action for source-language metadata correction."),
    sourceLocaleCorrectionError_invalid: message("sourceLocaleCorrectionError_invalid", "Enter a valid BCP-47 source language.", "Invalid source-language correction."),
    sourceLocaleCorrectionError_unauthenticated: message("sourceLocaleCorrectionError_unauthenticated", "Sign in to correct the source language.", "Unauthenticated source-language correction."),
    sourceLocaleCorrectionError_origin: message("sourceLocaleCorrectionError_origin", "This correction request could not be verified.", "Origin failure for source-language correction."),
    sourceLocaleCorrectionError_forbidden: message("sourceLocaleCorrectionError_forbidden", "You cannot correct the source language for this content.", "Forbidden source-language correction."),
    sourceLocaleCorrectionError_notFound: message("sourceLocaleCorrectionError_notFound", "The content to correct no longer exists.", "Missing source-language correction target."),
    sourceLocaleCorrectionError_conflict: message("sourceLocaleCorrectionError_conflict", "The content changed before the source language could be corrected. Reload and try again.", "Stale source-language correction."),
    sourceLocaleCorrectionError_unavailable: message("sourceLocaleCorrectionError_unavailable", "The source language could not be corrected. Please try again later.", "Temporary source-language correction storage failure."),
    forumWriteError_invalid: message("forumWriteError_invalid", "Enter all required fields.", "Forum mutation validation error."),
    forumWriteError_unauthenticated: message("forumWriteError_unauthenticated", "Sign in to post.", "Forum mutation authentication error."),
    forumWriteError_origin: message("forumWriteError_origin", "This request could not be verified.", "Forum mutation origin error."),
    forumWriteError_forbidden: message("forumWriteError_forbidden", "Only the topic author can change its solution.", "Forum solution authorization error."),
    forumWriteError_conflict: message("forumWriteError_conflict", "That solution cannot be selected for this topic.", "Forum solution state conflict."),
    forumWriteError_notFound: message("forumWriteError_notFound", "The target section or topic no longer exists.", "Forum mutation missing target error."),
    forumWriteError_rateLimited: message("forumWriteError_rateLimited", "Please wait a few seconds before posting again.", "Forum mutation rate limit error."),
    forumWriteError_unavailable: message("forumWriteError_unavailable", "Your message could not be saved. Please try again.", "Forum mutation storage error."),
    authorizationNav: message("authorizationNav", "Authorization", "Link to authorization management."),
    authorizationHeading: message("authorizationHeading", "Authorization management", "Authorization management page heading."),
    rolesHeading: message("rolesHeading", "Roles", "Role management heading."),
    usersHeading: message("usersHeading", "Users", "User authorization heading."),
    roleSlug: message("roleSlug", "Role slug", "Role slug field label."),
    displayName: message("displayName", "Display name", "Role display-name field label."),
    createRole: message("createRole", "Create custom role", "Create-role action."),
    save: message("save", "Save", "Generic save action."),
    deleteRole: message("deleteRole", "Delete role", "Delete-role action."),
    builtInRole: message("builtInRole", "Built-in", "Built-in role marker."),
    permissionsHeading: message("permissionsHeading", "Permissions", "Permissions heading."),
    effectivePermissions: message("effectivePermissions", "Effective permissions", "Effective permissions heading."),
    assignedRole: message("assignedRole", "Assigned role", "Assigned role field label."),
    defaultRole: message("defaultRole", "Default role", "Default role marker."),
    overrideInherit: message("overrideInherit", "Inherit", "Inherited permission option."),
    overrideAllow: message("overrideAllow", "Allow", "Allowed permission option."),
    overrideDeny: message("overrideDeny", "Deny", "Denied permission option."),
    authorizationSaved: message("authorizationSaved", "Authorization was updated.", "Successful authorization mutation message."),
    authorizationError_invalid: message("authorizationError_invalid", "Check the submitted values.", "Invalid authorization mutation."),
    authorizationError_forbidden: message("authorizationError_forbidden", "You cannot manage authorization.", "Forbidden authorization mutation."),
    authorizationError_notFound: message("authorizationError_notFound", "The selected role or user no longer exists.", "Missing authorization entity."),
    authorizationError_conflict: message("authorizationError_conflict", "This change would cause a lockout or the role is assigned.", "Authorization conflict."),
    authorizationError_unavailable: message("authorizationError_unavailable", "Authorization is temporarily unavailable.", "Authorization infrastructure error."),
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

function pluralMessage<const Key extends string, const Source extends UiStructuredMessageSource>(
  key: Key,
  source: Source,
  description: string,
  placeholders: readonly string[],
  protectedTerms: readonly string[] = [],
) {
  return {
    namespace: "common",
    key,
    source,
    description,
    placeholders,
    messageKind: "plural",
    protectedTerms,
  } as const satisfies UiMessageDescriptor;
}

export type UiNamespace = keyof typeof canonicalEnglishCatalog;
export type UiKey<N extends UiNamespace> = keyof (typeof canonicalEnglishCatalog)[N] & string;
type DescriptorSource<T> = T extends { readonly source: infer Source }
  ? Source extends string ? Source : string
  : never;
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
