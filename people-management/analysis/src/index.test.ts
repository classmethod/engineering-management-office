import { transform } from "./index";

describe("index", () => {
  describe("transform", () => {
    it("returns transformed data to write Google Sheets", () => {
      const actual = transform({
        0: { person01: null, person02: 1 },
        1: { person01: 1, person02: 3 },
      });
      const expected = [
        ["", "person01", "person02"],
        ["定期 1on1", null, 1],
        ["評価 目標設定", 1, 3],
      ];
      expect(actual).toEqual(expected);
    });
  });
});
