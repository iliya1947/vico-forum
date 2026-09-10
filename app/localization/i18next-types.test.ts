import { createInstance } from "i18next";
import { describe, expect, it } from "vitest";

describe("i18next resource types", () => {
  it("keeps canonical namespaces and keys strict without runtime descriptor resources", () => {
    const instance = createInstance();
    void instance.init({ initAsync: false, resources: {} });
    instance.t("heading", { ns: "common" });
    // @ts-expect-error unknown canonical key must fail typechecking
    instance.t("missingKey", { ns: "common" });
    // @ts-expect-error unknown canonical namespace must fail typechecking
    instance.t("heading", { ns: "missingNamespace" });
    expect(instance.store.data).toEqual({});
  });
});
