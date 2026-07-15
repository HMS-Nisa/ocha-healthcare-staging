import { z } from 'astro/zod';

export const blogEntrySchema = z.object({
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
}).superRefine((entry, context) => {
  if (entry.robots === 'index,follow' && !entry.sources) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['sources'],
      message: 'Indexable blog entries require at least two authoritative sources.',
    });
  }
});
