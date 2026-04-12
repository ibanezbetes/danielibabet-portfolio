import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Daniel Ibáñez Betés | Portfolio",
  description:
    "Personal portfolio of Daniel Ibáñez Betés — Web Developer & Software Architect.",
  keywords: [
    "Daniel Ibáñez Betés",
    "portfolio",
    "web developer",
    "software architect",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${inter.variable} font-sans antialiased bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100`}
      >
        <ThemeProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
