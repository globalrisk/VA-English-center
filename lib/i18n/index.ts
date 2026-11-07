import vi from "./vi.json";

export const LOCALE_COOKIE = "va-locale";
export const DEFAULT_LOCALE = "vi";
export type Locale = "vi" | "en";
export const localeTag = (locale: Locale) => locale === "vi" ? "vi-VN" : "en-GB";

export function resolveLocale(value?: string): Locale {
  return value === "en" ? "en" : DEFAULT_LOCALE;
}

type Values = Record<string, string | number>;
const messages: Record<string, string> = vi;
const has = (key: string) => Object.prototype.hasOwnProperty.call(messages, key);
const interpolate = (message: string, values: Values) =>
  message.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));

// Messages kept in component state remain in their source language. These
// patterns let them update when the locale changes without resetting a form.
const patterns = Object.keys(messages).filter((key) => /\{\d+\}/.test(key))
  .sort((a, b) => b.replace(/\{\d+\}/g, "").length - a.replace(/\{\d+\}/g, "").length)
  .map((key) => {
    const names: string[] = [];
    const escaped = key.split(/(\{\d+\})/).map((part) => {
      if (/^\{\d+\}$/.test(part)) {
        names.push(part.slice(1, -1));
        return "([\\s\\S]*?)";
      }
      return part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }).join("");
    return { key, names, regex: new RegExp(`^${escaped}$`) };
  });

export function createTranslator(locale: Locale) {
  return (message: string, values: Values = {}): string => {
    if (locale === "en") return interpolate(message, values);
    const key = message.trim();
    if (has(key)) {
      return message.replace(key, () => interpolate(messages[key], values));
    }
    for (const pattern of patterns) {
      const match = pattern.regex.exec(message);
      if (!match) continue;
      const captured = Object.fromEntries(pattern.names.map((name, index) => [name, match[index + 1]]));
      return interpolate(messages[pattern.key], { ...captured, ...values });
    }
    return message;
  };
}

export type Translator = ReturnType<typeof createTranslator>;
