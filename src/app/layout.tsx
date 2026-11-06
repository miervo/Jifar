import type { Metadata, Viewport } from "next";
import { Dela_Gothic_One, Onest } from "next/font/google";
import { content } from "@/config/content";
import "./globals.css";

// Выразительный заголовочный шрифт и спокойный текстовый — оба с кириллицей.
// Если Google Fonts недоступны, срабатывают системные замены из globals.css.
const display = Dela_Gothic_One({
  weight: "400",
  subsets: ["latin", "cyrillic"],
  variable: "--font-display",
  display: "swap",
  fallback: ["Arial Black", "Segoe UI Black", "system-ui", "sans-serif"],
});

const body = Onest({
  subsets: ["latin", "cyrillic"],
  variable: "--font-body",
  display: "swap",
  fallback: ["Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: content.meta.title,
  description: content.meta.description,
  // Личное приглашение не должно попадать в поисковики.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#DFF3FF",
};

// Стартовая позиция у копыт без «мелькания» головы: до первой отрисовки
// страница скрыта, после разбора документа прокручивается в самый низ.
// Срабатывает один раз за загрузку и только на главной.
const START_AT_HOOVES = `(function(){try{if(location.pathname!=="/")return;var d=document.documentElement;
if("scrollRestoration" in history)history.scrollRestoration="manual";d.classList.add("gp-pending");
var done=function(){if(window.__gpPositioned)return;window.__gpPositioned=true;window.scrollTo(0,d.scrollHeight);d.classList.remove("gp-pending");};
document.addEventListener("DOMContentLoaded",done);setTimeout(function(){d.classList.remove("gp-pending");},3000);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: START_AT_HOOVES }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
