// app/sitemap.ts
import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = "https://loacheck.com";


    return [
        { url: `${baseUrl}/guide/data/`, lastModified: new Date("2026-09-25T00:00:00+09:00"), changeFrequency: "monthly", priority: 0.7 },
        {
            url: `${baseUrl}/`,
            changeFrequency: "daily",
            priority: 1,
        },
        {
            url: `${baseUrl}/about/`,
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${baseUrl}/guide/`,
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${baseUrl}/articles/`,
            changeFrequency: "monthly",
            priority: 0.75,
        },
        {
            url: `${baseUrl}/articles/raid-checklist/`,
            lastModified: new Date("2026-09-25T00:00:00+09:00"),
            changeFrequency: "monthly",
            priority: 0.7,
        },
        {
            url: `${baseUrl}/articles/more-reward-efficiency/`,
            lastModified: new Date("2026-09-25T00:00:00+09:00"),
            changeFrequency: "monthly",
            priority: 0.7,
        },
        {
            url: `${baseUrl}/articles/auction-bid-guide/`,
            lastModified: new Date("2026-09-25T00:00:00+09:00"),
            changeFrequency: "monthly",
            priority: 0.7,
        },
        {
            url: `${baseUrl}/articles/weekly-raid-gold-guide/`,
            lastModified: new Date("2026-09-25T00:00:00+09:00"),
            changeFrequency: "monthly",
            priority: 0.7,
        },
        {
            url: `${baseUrl}/articles/bound-gold-guide/`,
            lastModified: new Date("2026-09-25T00:00:00+09:00"),
            changeFrequency: "monthly",
            priority: 0.7,
        },
        {
            url: `${baseUrl}/my-tasks/`,
            changeFrequency: "weekly",
            priority: 0.9,
        },
        {
            url: `${baseUrl}/party-tasks/`,
            changeFrequency: "weekly",
            priority: 0.9,
        },
        {
            url: `${baseUrl}/dps-share/`,
            changeFrequency: "weekly",
            priority: 0.8,
        },
        {
            url: `${baseUrl}/gem-setup/`,
            changeFrequency: "weekly",
            priority: 0.8,
        },
        {
            url: `${baseUrl}/calculator/auction/`,
            changeFrequency: "weekly",
            priority: 0.8,
        },
        {
            url: `${baseUrl}/calculator/more-reward/`,
            changeFrequency: "weekly",
            priority: 0.8,
        },
        {
            url: `${baseUrl}/calculator/gem/`,
            changeFrequency: "weekly",
            priority: 0.8,
        },
        {
            url: `${baseUrl}/calculator/weekly-gold/`,
            changeFrequency: "weekly",
            priority: 0.8,
        },
        {
            url: `${baseUrl}/calculator/craft/`,
            changeFrequency: "weekly",
            priority: 0.8,
        },
        {
            url: `${baseUrl}/raid-info/`,
            changeFrequency: "weekly",
            priority: 0.8,
        },
        {
            url: `${baseUrl}/privacy/`,
            changeFrequency: "monthly",
            priority: 0.3,
        },
        {
            url: `${baseUrl}/terms/`,
            changeFrequency: "monthly",
            priority: 0.3,
        },
    ];
}
