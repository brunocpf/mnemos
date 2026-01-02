import { Formats, hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { routing } from "@/i18n/routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});

export const formats = {
  dateTime: {
    short: {
      year: "numeric" as const,
      month: "short" as const,
      day: "numeric" as const,
    },
    long: {
      year: "numeric" as const,
      month: "long" as const,
      day: "numeric" as const,
      weekday: "long" as const,
    },
  },
  number: {
    currency: {
      style: "currency" as const,
      currency: "USD",
    },
  },
} satisfies Formats;
