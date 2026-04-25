import { z } from 'zod';

export const ExtractionContextSchema = z.object({
  title: z.string(),
  url: z.string(),
});

export type ExtractionContext = z.infer<typeof ExtractionContextSchema>;

export const ExtractionResultSchema = z.object({
  heroCaption: z.string().nullable(),
});

export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;
