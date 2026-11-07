import { cookies } from "next/headers";
import { cache } from "react";
import { createTranslator, LOCALE_COOKIE, resolveLocale } from "./index";

export const getLocale = cache(async () =>
  resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value)
);

export async function getTranslations() {
  return createTranslator(await getLocale());
}
