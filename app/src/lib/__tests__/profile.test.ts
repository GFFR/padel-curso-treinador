import { describe, expect, it } from "vitest";

import { formatStudentIdentity } from "@/lib/profile";

describe("formatStudentIdentity", () => {
  it("formats name and email together", () => {
    expect(
      formatStudentIdentity({
        displayName: "Gonçalo Ramalho",
        email: "goncaloramalho88@gmail.com",
      }),
    ).toBe("Gonçalo Ramalho <goncaloramalho88@gmail.com>");
  });

  it("falls back to email when name is missing", () => {
    expect(
      formatStudentIdentity({ displayName: null, email: "a@b.com" }),
    ).toBe("a@b.com");
  });

  it("falls back to name when email is missing", () => {
    expect(
      formatStudentIdentity({ displayName: "Ana", email: null }),
    ).toBe("Ana");
  });

  it("uses custom fallback when both are missing", () => {
    expect(
      formatStudentIdentity({ displayName: null, email: null }, ""),
    ).toBe("");
  });
});
