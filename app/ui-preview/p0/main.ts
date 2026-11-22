import { importRoute, routeManifest } from "virtual:vico-ui-preview-routes";

/**
 * Temporary import-graph diagnostic, NOT a preview screen or fake forum UI.
 * P0's following slices provide the actual Data Router, capabilities and
 * product rendering. This candidate is never used by Pages deployment.
 */
const root = document.getElementById("root");
if (!root) throw new Error("P0 candidate mount is missing");

const mustLoad = ["root", "routes/locale-boundary", "routes/topic"] as const;

try {
  const [app, boundary, topic] = await Promise.all(mustLoad.map(importRoute));
  if (
    typeof app.default !== "function"
    || typeof boundary.default !== "function"
    || typeof boundary.loader !== "function"
    || typeof topic.default !== "function"
    || typeof topic.loader !== "function"
    || typeof topic.action !== "function"
  ) {
    throw new Error("Real forum route module exports are incomplete");
  }
  if (!routeManifest.children?.some((route) => route.id === "routes/locale-boundary")) {
    throw new Error("Current route hierarchy did not reach the browser");
  }

  root.dataset.status = "modules-imported";
  root.textContent = "Real forum route modules imported; data/router execution not yet verified.";
} catch (error) {
  root.dataset.status = "import-failed";
  root.textContent = "Real forum module import failed; see the browser console.";
  throw error;
}
