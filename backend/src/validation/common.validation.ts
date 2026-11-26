import { z } from 'zod';
import mongoose from 'mongoose';

export const objectIdParamSchema = z.object({
  id: z.string().refine((v) => mongoose.Types.ObjectId.isValid(v), 'Invalid id'),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

