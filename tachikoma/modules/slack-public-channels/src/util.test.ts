import { buildUrl } from ".";

describe("util", () => {
  describe("buildUrl", () => {
    it("", () => {
      expect(buildUrl("http://example.com")).toBe("http://example.com");
    });

    test("", () => {
      expect(
        buildUrl("http://example.com", {
          foo: 1,
        })
      ).toBe("http://example.com?foo=1");
    });

    test("", () => {
      expect(
        buildUrl("http://example.com", {
          高木: 1,
        })
      ).toBe("http://example.com?%E9%AB%98%E6%9C%A8=1");
    });
  });
});
