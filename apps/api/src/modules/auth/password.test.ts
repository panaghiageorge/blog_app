import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password.js";

describe("password hashing", () => {
  it("verifies a password against its hash", async () => {
    const passwordHash = await hashPassword("password123");

    await expect(verifyPassword("password123", passwordHash)).resolves.toBe(
      true,
    );
    await expect(verifyPassword("wrong-password", passwordHash)).resolves.toBe(
      false,
    );
  });

  it("rejects malformed hashes", async () => {
    await expect(
      verifyPassword("password123", "not-a-valid-hash"),
    ).resolves.toBe(false);
  });
});
