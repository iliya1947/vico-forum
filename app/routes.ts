import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/locale-negotiation.ts"),
  route("api/*", "routes/api.ts"),
  route(":locale", "routes/locale-boundary.tsx", [route("*", "routes/home.tsx")]),
] satisfies RouteConfig;
