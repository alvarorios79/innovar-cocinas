import { describe, it, expect } from "vitest";
import { apiRateLimiter, authRateLimiter, uploadRateLimiter } from "./rate-limiter";

describe("Rate Limiter", () => {
  it("debe exportar apiRateLimiter como middleware", () => {
    expect(apiRateLimiter).toBeDefined();
    expect(typeof apiRateLimiter).toBe("function");
  });

  it("debe exportar authRateLimiter como middleware", () => {
    expect(authRateLimiter).toBeDefined();
    expect(typeof authRateLimiter).toBe("function");
  });

  it("debe exportar uploadRateLimiter como middleware", () => {
    expect(uploadRateLimiter).toBeDefined();
    expect(typeof uploadRateLimiter).toBe("function");
  });
});
