import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/locale-negotiation.ts"),
  route("api/auth/*", "routes/auth-api.ts"),
  route("api/*", "routes/api.ts"),
  route(":locale", "routes/locale-boundary.tsx", [
    index("routes/home.tsx"),
    route("categories/:categoryId", "routes/category.tsx"),
    route("sections/:sectionId", "routes/section.tsx"),
    route("topics/:topicId", "routes/topic.tsx"),
    route("search", "routes/search.tsx"),
    route("popular", "routes/popular.tsx"),
    route("unanswered", "routes/unanswered.tsx"),
    route("unread", "routes/unread.tsx"),
    route("users/:userId", "routes/profile.tsx"),
    route("presence", "routes/presence.ts"),
    route("notifications", "routes/notifications.tsx"),
    route("tags", "routes/tags.tsx"),
    route("tags/:tagKey", "routes/tag.tsx"),
    route("admin/authorization", "routes/authorization-admin.tsx"),
    route("under-development", "routes/under-development.tsx"),
    route("*", "routes/not-found.ts"),
  ]),
] satisfies RouteConfig;
