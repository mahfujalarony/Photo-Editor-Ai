import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lumina AI",
    short_name: "LuminaAI",
    description: "AI photo editing toolkit.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1220",
    theme_color: "#0b1220",
    icons: [
      {
        src: "/photoeditor.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
