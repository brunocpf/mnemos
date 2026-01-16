import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations("Manifest");

  return {
    short_name: "Mnemos",
    name: "Mnemos",
    description: t("description"),
    icons: [
      {
        src: "/img/android/android-launchericon-512-512.png",
        type: "image/png",
        sizes: "512x512",
      },
      {
        src: "/img/android/android-launchericon-192-192.png",
        type: "image/png",
        sizes: "192x192",
      },
      {
        src: "/img/ios/192.png",
        type: "image/png",
        sizes: "192x192",
      },
      {
        src: "/img/ios/512.png",
        type: "image/png",
        sizes: "512x512",
      },
      {
        src: "/img/maskable/android/android-launchericon-512-512.png",
        type: "image/png",
        sizes: "512x512",
        purpose: "maskable",
      },
      {
        src: "/img/maskable/android/android-launchericon-192-192.png",
        type: "image/png",
        sizes: "192x192",
        purpose: "maskable",
      },
      {
        src: "/img/maskable/ios/192.png",
        type: "image/png",
        sizes: "192x192",
        purpose: "maskable",
      },
      {
        src: "/img/maskable/ios/512.png",
        type: "image/png",
        sizes: "512x512",
        purpose: "maskable",
      },
    ],
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
  };
}
