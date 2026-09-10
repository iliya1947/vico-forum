import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  // React Router 8.3.1 predates upstream lazy-discovery fixes #15395/#15489; re-evaluate after upgrading.
  routeDiscovery: { mode: "initial" },
} satisfies Config;
