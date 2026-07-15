// src/content/config.ts
import { defineCollection, z } from 'astro:content';

// 1. BLOG COLLECTION
const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    subtitle: z.string(),
    author: z.string().default('Ocha Team'),
    reviewer: z.string().optional(),
    date: z.date(),
    updatedDate: z.coerce.date(),
    image: z.string(),
    category: z.string(),
    readTime: z.string(),
    robots: z.enum(['index,follow', 'noindex,follow']).default('index,follow'),
    sources: z.array(z.object({ label: z.string(), url: z.string().url() })).min(2).optional(),
    faq: z.array(z.object({ question: z.string(), answer: z.string() })).min(2).optional(),
    medicalDisclaimer: z.string().min(40),
  }),
});

// 2. LEAD MAGNET COLLECTION
const magnetCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    headline: z.string(),
    subheadline: z.string(),
    ctaText: z.string().default('Download Sekarang'),
    coverImage: z.string(),
    benefits: z.array(z.string()),
    formUrl: z.string().optional(), 
    formId: z.string().optional(), // 👈 The new field for embedded forms
  }),
});

// 3. EXPORT BOTH
export const collections = {
  'blog': blogCollection,
  'magnets': magnetCollection,
};
