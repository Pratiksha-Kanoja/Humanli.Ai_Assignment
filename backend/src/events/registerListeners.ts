import mongoose from 'mongoose';
import { ActivityLog } from '../models/ActivityLog';
import { eventBus } from './eventBus';

export function registerEventListeners() {
  eventBus.on('ticket.created', async ({ ticketId, actorId }) => {
    await ActivityLog.create({
      eventType: 'ticket.created',
      actor: new mongoose.Types.ObjectId(actorId),
      ticket: new mongoose.Types.ObjectId(ticketId),
    });
  });

  eventBus.on('ticket.updated', async ({ ticketId, actorId, changes }) => {
    await ActivityLog.create({
      eventType: 'ticket.updated',
      actor: new mongoose.Types.ObjectId(actorId),
      ticket: new mongoose.Types.ObjectId(ticketId),
      metadata: { changes },
    });
  });

  eventBus.on('ticket.status_changed', async ({ ticketId, actorId, from, to }) => {
    await ActivityLog.create({
      eventType: 'ticket.status_changed',
      actor: new mongoose.Types.ObjectId(actorId),
      ticket: new mongoose.Types.ObjectId(ticketId),
      metadata: { from, to },
    });
  });

  eventBus.on('ticket.priority_changed', async ({ ticketId, actorId, from, to }) => {
    await ActivityLog.create({
      eventType: 'ticket.priority_changed',
      actor: new mongoose.Types.ObjectId(actorId),
      ticket: new mongoose.Types.ObjectId(ticketId),
      metadata: { from, to },
    });
  });

  eventBus.on('comment.added', async ({ ticketId, actorId, commentId }) => {
    await ActivityLog.create({
      eventType: 'comment.added',
      actor: new mongoose.Types.ObjectId(actorId),
      ticket: new mongoose.Types.ObjectId(ticketId),
      metadata: { commentId },
    });
  });

  eventBus.on('ticket.resolved', async ({ ticketId, actorId }) => {
    await ActivityLog.create({
      eventType: 'ticket.resolved',
      actor: new mongoose.Types.ObjectId(actorId),
      ticket: new mongoose.Types.ObjectId(ticketId),
    });
  });
}

