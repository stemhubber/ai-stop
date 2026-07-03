import { formatZAR, slugify, toE164 } from "./product";

describe("product utilities", () => {
  test("creates stable public slugs", () => {
    expect(slugify(" Thandi's Kitchen ")).toBe("thandi-s-kitchen");
  });

  test("stores South African numbers in E.164", () => {
    expect(toE164("071 234 5678")).toBe("+27712345678");
    expect(toE164("+27 71 234 5678")).toBe("+27712345678");
  });

  test("formats cents as South African currency", () => {
    expect(formatZAR(846000)).toMatch(/R\s?8[,\s]460/);
  });
});
