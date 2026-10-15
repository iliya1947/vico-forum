import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../styles.css";
import "./preview.css";
import { EmbeddedPreview, PreviewController, type PreviewIdentity } from "./preview-app";

const root = document.getElementById("root");
if (!root) throw new Error("UI preview root element is missing.");

const params = new URLSearchParams(window.location.search);
const embedded = params.get("embed") === "1";
const identityParam = params.get("identity");
const identity: PreviewIdentity | undefined =
  identityParam === "guest" || identityParam === "user" || identityParam === "manager"
    ? identityParam
    : undefined;
document.body.classList.add(embedded ? "ui-preview-embedded" : "ui-preview-controller");

createRoot(root).render(
  <StrictMode>
    {embedded
      ? <EmbeddedPreview scenarioId={params.get("scenario") ?? "home-guest"} identity={identity} />
      : <PreviewController />}
  </StrictMode>,
);
