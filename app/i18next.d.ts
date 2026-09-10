import type { CanonicalResourceShape } from "./localization/catalog";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: CanonicalResourceShape;
    strictKeyChecks: true;
  }
}
