import type { Metadata, Viewport } from "next";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Figtree } from "next/font/google";
import { notFound } from "next/navigation";

import { AppFooter } from "@/components/app-footer";
import { AppHeader } from "@/components/app-header";
import { OnboardingGate } from "@/components/onboarding-gate";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { routing } from "@/i18n/routing";
import { EmbedderProvider } from "@/providers/embedder-provider";
import { HistoryProvider } from "@/providers/history-provider";
import { SearchValueProvider } from "@/providers/search-value-provider";
import { SerwistProvider } from "@/providers/serwist-provider";
import { SettingsProvider } from "@/providers/settings-provider";
import { SummarizerProvider } from "@/providers/summarizer-provider";

import "./globals.css";

const font = Figtree({ subsets: ["latin"], variable: "--font-sans" });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata");

  const APP_NAME = "Mnemos";
  const APP_DEFAULT_TITLE = t("defaultTitle");
  const APP_TITLE_TEMPLATE = t("titleTemplate");
  const APP_DESCRIPTION = t("description");

  return {
    applicationName: APP_NAME,
    title: {
      default: APP_DEFAULT_TITLE,
      template: APP_TITLE_TEMPLATE,
    },
    description: APP_DESCRIPTION,
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: APP_DEFAULT_TITLE,
      startupImage: [],
    },
    formatDetection: {
      telephone: false,
    },
    openGraph: {
      type: "website",
      siteName: APP_NAME,
      title: {
        default: APP_DEFAULT_TITLE,
        template: APP_TITLE_TEMPLATE,
      },
      description: APP_DESCRIPTION,
    },
    twitter: {
      card: "summary",
      title: {
        default: APP_DEFAULT_TITLE,
        template: APP_TITLE_TEMPLATE,
      },
      description: APP_DESCRIPTION,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  interactiveWidget: "resizes-visual",
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[locale]">) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html
      className={`h-dvh snap-none overflow-y-auto scroll-smooth focus-within:snap-none ${font.variable}`}
      lang={locale}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <head />
      <body className="antialiased">
        <SerwistProvider swUrl="/serwist/sw.js">
          <NextIntlClientProvider>
            <HistoryProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
              >
                <SettingsProvider>
                  <EmbedderProvider>
                    <SummarizerProvider>
                      <SearchValueProvider>
                        <AppHeader />
                        <OnboardingGate />
                        {children}
                        <AppFooter />
                        <Toaster />
                      </SearchValueProvider>
                    </SummarizerProvider>
                  </EmbedderProvider>
                </SettingsProvider>
              </ThemeProvider>
            </HistoryProvider>
          </NextIntlClientProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
