const formatters = new Map<string, Intl.DateTimeFormat>();

export function getDateFormatter(locale: string) {
  let formatter = formatters.get(locale);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
    formatters.set(locale, formatter);
  }
  return formatter;
}
