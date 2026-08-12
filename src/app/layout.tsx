import type { Metadata } from "next";
import { Space_Grotesk, Manrope } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { Toaster } from "@/components/ui/sonner";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Luminaq — AI Visual Library",
    template: "%s · Luminaq",
  },
  description:
    "A visual library of AI-assisted photography, illustration and 3D. Browse, download and remix freely.",
  icons: {
    icon: "/luminaq.ico",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${spaceGrotesk.variable} ${manrope.variable} min-h-full flex flex-col font-sans antialiased`}>
        <ThemeProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <SiteFooter />
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
