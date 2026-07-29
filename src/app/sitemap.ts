import type { MetadataRoute } from "next";

const SITE_URL = "https://pontuaenem.com.br";
const LAST_MODIFIED = new Date("2026-07-29T00:00:00-03:00");

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: LAST_MODIFIED,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/checkout`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/termos`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/privacidade`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${SITE_URL}/reembolso`,
      lastModified: LAST_MODIFIED,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];
}
