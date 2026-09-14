import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/locale-negotiation.ts"),
  route("api/*", "routes/api.ts"),
  route(":locale", "routes/locale-boundary.tsx", [
    index("routes/home.tsx"),
    route("categories/:categoryId", "routes/category.tsx"),
    route("sections/:sectionId", "routes/section.tsx"),
    route("topics/:topicId", "routes/topic.tsx"),
    route("*", "routes/not-found.ts"),
  ]),
] satisfies RouteConfig;
