import { describe, expect, it } from "vitest";

import { loginSchema, resetPasswordSchema, signupSchema } from "./form-schemas";

describe("password validation", () => {
  it.each([8, 11, 12, 128, 129])("validates signup and reset at length %i", (length) => {
    const password = "x".repeat(length);
    const expected = length >= 12 && length <= 128;
    expect(
      signupSchema.safeParse({ email: "test@example.com", name: "Test", password }).success,
    ).toBe(expected);
    expect(resetPasswordSchema.safeParse({ confirmPassword: password, password }).success).toBe(
      expected,
    );
  });

  it("keeps login compatible with existing passwords", () => {
    expect(loginSchema.safeParse({ email: "test@example.com", password: "existing" }).success).toBe(
      true,
    );
  });
});
