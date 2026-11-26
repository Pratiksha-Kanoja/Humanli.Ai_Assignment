import { z } from 'zod';
import mongoose from 'mongoose';
import { ticketPriorities, ticketStatuses } from '../models/Ticket';

export const createTicketSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(3).max(5000),
  category: z.string().min(2).max(60),
  priority: z.enum(ticketPriorities).optional(),
});
export type CreateTicketBody = z.infer<typeof createTicketSchema>;

export const updateMyTicketSchema = z
  .object({
    title: z.string().min(3).max(120).optional(),
    description: z.string().min(3).max(5000).optional(),
    category: z.string().min(2).max(60).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field is required' });
export type UpdateMyTicketBody = z.infer<typeof updateMyTicketSchema>;

export const addCommentSchema = z.object({
  body: z.string().min(1).max(2000),
});
export type AddCommentBody = z.infer<typeof addCommentSchema>;

export const adminTicketListQuerySchema = z.object({
  status: z.enum(ticketStatuses).optional(),
  priority: z.enum(ticketPriorities).optional(),
  userId: z
    .string()
    .refine((v) => mongoose.Types.ObjectId.isValid(v), 'Invalid userId')
    .optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});
export type AdminTicketListQuery = z.infer<typeof adminTicketListQuerySchema>;

export const adminUpdateTicketSchema = z
  .object({
    status: z.enum(ticketStatuses).optional(),
    priority: z.enum(ticketPriorities).optional(),
  })
  .refine((v) => v.status || v.priority, { message: 'status or priority is required' });
export type AdminUpdateTicketBody = z.infer<typeof adminUpdateTicketSchema>;

