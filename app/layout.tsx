import type { Metadata } from "next";
import { Caveat, Nunito, Patrick_Hand } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/components/i18n/LanguageProvider";
import { getLocale, getTranslations } from "@/lib/i18n/server";

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  weight: ["400", "600", "700"],
});

const patrickHand = Patrick_Hand({
  subsets: ["latin"],
  variable: "--font-patrick",
  weight: "400",
});

const nunito = Nunito({
  subsets: ["latin", "vietnamese"],
  variable: "--font-nunito",
  weight: ["400", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();
  return {
    title: t("VA English Center — Learn English with Joy"),
    description: t("A cozy, creative English center where learning feels like art. Courses for kids, teens, and adults."),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${caveat.variable} ${patrickHand.variable} ${nunito.variable}`}
    >
      <body><LanguageProvider locale={locale}>{children}</LanguageProvider></body>
    </html>
  );
}
