import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import ThemeProvider from "@/src/components/ThemeProvider";
import CookieConsent from "@/src/components/CookieConsent";
import { LoadingProvider } from "@/src/components/LoadingProvider";
import "./globals.css";
//Speed Insights Vercel
import { SpeedInsights } from "@vercel/speed-insights/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pijar Bright RO Makassar",
  description: "Pusat Informasi & Jejaring Awardee Bright Scholarship RO Makassar",
};

// Inline script to prevent flash of wrong theme on load
const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('theme');
    if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <LoadingProvider>
            <CookieConsent />
            {children}
            <Toaster position="top-center" />
            <SpeedInsights />
          </LoadingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
