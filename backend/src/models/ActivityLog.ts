import mongoose, { type InferSchemaType } from 'mongoose';

export const activityEventTypes = [
  'ticket.created',
  'ticket.updated',
  'ticket.status_changed',
  'ticket.priority_changed',
  'comment.added',
  'ticket.resolved',
] as const;

export type ActivityEventType = (typeof activityEventTypes)[number];

const activityLogSchema = new mongoose.Schema(
  {
    eventType: { type: String, enum: activityEventTypes, required: true, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true },
);

activityLogSchema.index({ ticket: 1, createdAt: -1 });

export type ActivityLogDoc = InferSchemaType<typeof activityLogSchema> & { _id: mongoose.Types.ObjectId };

export const ActivityLog = mongoose.model<ActivityLogDoc>('ActivityLog', activityLogSchema);

