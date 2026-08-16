import type { Metadata } from "next";
import { Space_Grotesk, Manrope } from "next/font/google";
import "./globals.css";
import Script from "next/script";

import { ThemeProvider } from "@/components/theme-provider";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { Toaster } from "@/components/ui/sonner";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { NuqsAdapter } from "nuqs/adapters/next/app";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://luminaq.xyz"),
  title: {
    default: "Luminaq — AI Visual Library",
    template: "%s · Luminaq",
  },
  description:
    "A visual library of AI-assisted photography, illustration and 3D. Browse, download and remix freely.",
  icons: {
    icon: "/luminaq.ico",
  },
  openGraph: {
    title: "Luminaq — AI Visual Library",
    description:
      "A visual library of AI-assisted photography, illustration and 3D. Browse, download and remix freely.",
    url: "https://luminaq.xyz",
    siteName: "Luminaq",
    type: "website",
    images: [
      {
        url: "/luminaq.svg",
        width: 800,
        height: 800,
        alt: "Luminaq Logo",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Luminaq — AI Visual Library",
    description:
      "A visual library of AI-assisted photography, illustration and 3D. Browse, download and remix freely.",
    images: ["/luminaq.svg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head />
      <body suppressHydrationWarning className={`${spaceGrotesk.variable} ${manrope.variable} min-h-full flex flex-col font-sans antialiased`}>
        {process.env.NODE_ENV === "development" && (
          <Script id="remove-bis-skin-checked" strategy="beforeInteractive">
            {`
              (function() {
                const removeAttrs = () => {
                  document.querySelectorAll('[bis_skin_checked]').forEach(el => {
                    el.removeAttribute('bis_skin_checked');
                  });
                };
                removeAttrs();
                const observer = new MutationObserver((mutations) => {
                  for (const mutation of mutations) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'bis_skin_checked') {
                      const target = mutation.target;
                      if (target && target.nodeType === 1 && target.hasAttribute('bis_skin_checked')) {
                        target.removeAttribute('bis_skin_checked');
                      }
                    } else if (mutation.type === 'childList') {
                      mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                          const el = node;
                          if (el.hasAttribute('bis_skin_checked')) {
                            el.removeAttribute('bis_skin_checked');
                          }
                          el.querySelectorAll('[bis_skin_checked]').forEach(child => {
                            child.removeAttribute('bis_skin_checked');
                          });
                        }
                      });
                    }
                  }
                });
                observer.observe(document.documentElement, {
                  childList: true,
                  subtree: true,
                  attributes: true,
                  attributeFilter: ['bis_skin_checked']
                });
              })();
            `}
          </Script>
        )}
        <NuqsAdapter>
          <ThemeProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <SiteFooter />
            <Toaster position="bottom-right" />
            <PwaInstallPrompt />
          </ThemeProvider>
        </NuqsAdapter>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
