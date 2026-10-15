import { describe, expect, it } from "vitest";
import { rateLimit } from "../../db/schema";
import {
  betterAuthEmailPasswordOptions,
  betterAuthIpAddressOptions,
  betterAuthAdvancedOptions,
  betterAuthRateLimitOptions,
  betterAuthSchema,
} from "./auth.server";

describe("Better Auth security/database configuration", () => {
  it("enables email/password signup and signin without mandatory verification", () => {
    expect(betterAuthEmailPasswordOptions).toEqual({
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    });
  });

  it("uses the checked-in Better Auth rate-limit model and database storage", () => {
    expect(betterAuthSchema.rateLimit).toBe(rateLimit);
    expect(betterAuthRateLimitOptions).toEqual({
      enabled: true,
      storage: "database",
      modelName: "rateLimit",
    });
  });

  it("trusts only Cloudflare's sanitized client-IP boundary", () => {
    expect(betterAuthIpAddressOptions).toEqual({ ipAddressHeaders: ["cf-connecting-ip"] });
    expect(betterAuthAdvancedOptions).not.toHaveProperty("disableCSRFCheck");
    expect(betterAuthAdvancedOptions).not.toHaveProperty("disableOriginCheck");
  });
});
