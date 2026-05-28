import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: "https://app.toilabap.com",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://app.toilabap.com/agency-agent/",
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];
}
