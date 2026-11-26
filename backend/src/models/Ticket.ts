import mongoose, { type InferSchemaType } from 'mongoose';

export const ticketPriorities = ['low', 'medium', 'high', 'urgent'] as const;
export type TicketPriority = (typeof ticketPriorities)[number];

export const ticketStatuses = ['open', 'in_progress', 'resolved', 'closed'] as const;
export type TicketStatus = (typeof ticketStatuses)[number];

const ticketSchema = new mongoose.Schema(
  {
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120 },
    description: { type: String, required: true, trim: true, minlength: 3, maxlength: 5000 },
    category: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    priority: { type: String, enum: ticketPriorities, default: 'medium', required: true, index: true },
    status: { type: String, enum: ticketStatuses, default: 'open', required: true, index: true },
  },
  { timestamps: true },
);

ticketSchema.index({ createdBy: 1, createdAt: -1 });

export type TicketDoc = InferSchemaType<typeof ticketSchema> & { _id: mongoose.Types.ObjectId };

export const Ticket = mongoose.model<TicketDoc>('Ticket', ticketSchema);

