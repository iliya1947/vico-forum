import type { Config } from "@react-router/dev/config";

export default {
  ssr: true,
  // Keep the small route manifest eager while upstream catch-all/lazy-discovery issue #15326 remains unresolved.
  routeDiscovery: { mode: "initial" },
} satisfies Config;
