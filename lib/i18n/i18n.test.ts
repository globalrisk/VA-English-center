import { describe, expect, it } from "vitest";
import { createTranslator, localeTag, resolveLocale } from "./index";
import vi from "./vi.json";
import { formatVietnamDateTime, formatVietnamTime } from "../attendance";

describe("language selection and translations", () => {
  it("defaults to Vietnamese and accepts only the supported English preference", () => {
    for (const value of [undefined, "vi", "fr", "", "VI", "../../en"]) {
      expect(resolveLocale(value)).toBe("vi");
    }
    expect(resolveLocale("en")).toBe("en");
    expect(localeTag("vi")).toBe("vi-VN");
    expect(localeTag("en")).toBe("en-GB");
  });

  it("translates interface text and retains surrounding spaces", () => {
    const t = createTranslator("vi");
    expect(t("Courses")).toBe("Khóa học");
    expect(t(" Courses ")).toBe(" Khóa học ");
    expect(t("Invalid login credentials")).toBe("Email hoặc mật khẩu không đúng.");
    expect(createTranslator("en")("Courses")).toBe("Courses");
  });

  it("interpolates counts and preserves authored names literally", () => {
    const name = "Minh $& {1} <b>";
    expect(createTranslator("vi")("Check in as {0}?", { 0: name })).toBe(`Điểm danh cho ${name}?`);
    expect(createTranslator("en")("{0} of {1} lessons", { 0: 2, 1: 5 })).toBe("2 of 5 lessons");
  });

  it("relocalizes source messages stored before a language switch", () => {
    const sourceMessage = 'Created lesson "Animals".';
    expect(createTranslator("vi")(sourceMessage)).toBe('Đã tạo bài học "Animals".');
    expect(createTranslator("en")(sourceMessage)).toBe(sourceMessage);
    expect(createTranslator("vi")("Question 2 needs at least 3 answer options.")).toBe("Câu 2 cần ít nhất 3 lựa chọn trả lời.");
    expect(createTranslator("vi")("Unknown message (with punctuation)?")).toBe("Unknown message (with punctuation)?");
  });

  it("keeps every translated message's interpolation parameters", () => {
    for (const [source, translated] of Object.entries(vi)) {
      expect(translated.trim(), source).not.toBe("");
      const params = (value: string) => [...new Set(value.match(/\{\w+\}/g))].sort();
      expect(params(translated), source).toEqual(params(source));
    }
  });

  it("uses the selected language while keeping attendance time in Vietnam", () => {
    const date = "2026-11-07T02:00:00.000Z";
    expect(formatVietnamDateTime(date, "vi")).toContain("thg 11");
    expect(formatVietnamDateTime(date, "en")).toContain("Sat");
    expect(formatVietnamTime(date, "vi")).toBe("09:00");
    expect(formatVietnamTime(date, "en")).toBe("09:00");
  });
});
