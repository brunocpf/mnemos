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
        src: "/manifest-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/manifest-icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
  };
}
