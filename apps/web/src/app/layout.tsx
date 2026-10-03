import type { Metadata } from "next";
import {
  Noto_Sans,
  Noto_Sans_Georgian,
  Noto_Serif,
  Noto_Serif_Georgian,
} from "next/font/google";
import "./globals.css";

// Only latin is preloaded. Other subsets (latin-ext incl. ₾, cyrillic, georgian)
// load on demand via unicode-range.
const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
});

const notoSerif = Noto_Serif({
  variable: "--font-noto-serif",
  subsets: ["latin"],
});

const notoSansGeorgian = Noto_Sans_Georgian({
  variable: "--font-noto-sans-georgian",
  subsets: ["georgian"],
  preload: false,
});

const notoSerifGeorgian = Noto_Serif_Georgian({
  variable: "--font-noto-serif-georgian",
  subsets: ["georgian"],
  preload: false,
});

export const metadata: Metadata = {
  title: "Villa Mestia",
  description: "A small family hotel in Mestia, Svaneti.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${notoSans.variable} ${notoSerif.variable} ${notoSansGeorgian.variable} ${notoSerifGeorgian.variable} h-full antialiased`}
    >
      {/* Extensions (e.g. ColorZilla) add attributes to <body> before hydration */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
