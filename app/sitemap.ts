import type { MetadataRoute } from "next";

const siteUrl = "https://photoeditor.rony.studio";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/tools/nature-background-editor`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/tools/remove-background`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/tools/image-to-text`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,  
    },
    {
      url: `${siteUrl}/tools/image-resizer`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }
  ];
}
