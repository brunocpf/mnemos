/**
 * Maps a document URL to the precached app shell that can stand in for it when
 * the network is down.
 *
 * Every shell reads its dynamic parts (note id, folder id, share payload) from
 * the URL on the client and loads data from IndexedDB, so one precached
 * document per route and locale serves all of its query strings and ids.
 */

const LOCALE_PREFIXES = ["pt-BR"];

const STATIC_ROUTES = new Set([
  "/",
  "/note",
  "/share",
  "/settings",
  "/privacy-policy",
]);

const FOLDER_ROUTE = /^\/folders\/[^/]+$/;

/**
 * The precache URL of the shell for `pathname`, or `null` when the path is not
 * an app route (the offline page applies then). The locale prefix is kept, so a
 * shell is never served to the other locale.
 */
export function getOfflineShellPath(pathname: string): string | null {
  const trimmed =
    pathname.length > 1 && pathname.endsWith("/")
      ? pathname.slice(0, -1)
      : pathname;

  let prefix = "";
  let route = trimmed;
  for (const locale of LOCALE_PREFIXES) {
    const localePrefix = `/${locale}`;
    if (trimmed === localePrefix || trimmed.startsWith(`${localePrefix}/`)) {
      prefix = localePrefix;
      route = trimmed.slice(localePrefix.length) || "/";
      break;
    }
  }

  if (STATIC_ROUTES.has(route)) {
    return route === "/" ? prefix || "/" : `${prefix}${route}`;
  }
  if (FOLDER_ROUTE.test(route)) return `${prefix}/folders/_`;
  return null;
}
