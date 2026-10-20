import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations("Manifest");

  return {
    short_name: "Mnemos",
    name: "Mnemos",
    description: t("description"),
    id: "/",
    icons: [
      {
        src: "/img/android/android-launchericon-192-192.png",
        type: "image/png",
        sizes: "192x192",
        purpose: "any",
      },
      {
        src: "/img/android/android-launchericon-512-512.png",
        type: "image/png",
        sizes: "512x512",
        purpose: "any",
      },
      {
        src: "/img/maskable/android/android-launchericon-192-192.png",
        type: "image/png",
        sizes: "192x192",
        purpose: "maskable",
      },
      {
        src: "/img/maskable/android/android-launchericon-512-512.png",
        type: "image/png",
        sizes: "512x512",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: t("shortcuts.newNote"),
        url: "/note?new=1",
        icons: [
          {
            src: "/img/android/android-launchericon-192-192.png",
            sizes: "192x192",
            type: "image/png",
          },
        ],
      },
    ],
    categories: ["productivity", "utilities"],
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
  };
}
