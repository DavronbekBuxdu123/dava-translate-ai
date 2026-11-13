import { z } from 'zod';
export const languageSchema = z.enum(['uz', 'ru']);
export const translationSchema = z.object({ text: z.string().trim().min(1, 'Matn kiriting.').max(5000, 'Ko‘pi bilan 5000 belgi.'), sourceLang: languageSchema, tone: z.enum(['casual','formal']).default('casual') });
export const translationOutput = z.object({ translatedText: z.string().min(1).max(15000) });
export const speechSchema = z.object({ text: z.string().trim().min(1).max(5000), language: languageSchema });
export const favoriteSchema = z.object({ translationId: z.string().min(1).max(100) });
export const listSchema = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1), q: z.string().max(200).default(''), language: languageSchema.optional(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => !Number.isNaN(Date.parse(v)), 'Sana noto‘g‘ri.').optional() });
