import { z } from 'zod';

const CompanyInfoEntrySchema = z.object({
  id: z.string().default(''),
  name: z.string().default(''),
  address: z.string().default(''),
  taxCode: z.string().default(''),
  tel: z.string().default(''),
  email: z.string().default(''),
});
export type CompanyInfoConfig = z.infer<typeof CompanyInfoEntrySchema>;

export const CompanyInfoSchema = z
  .preprocess((v) => (v == null ? [] : Array.isArray(v) ? v : [v]), z.array(CompanyInfoEntrySchema))
  .default([]);

export function normalizeCompanyInfoList(raw: unknown): CompanyInfoConfig[] {
  return CompanyInfoSchema.parse(raw);
}
