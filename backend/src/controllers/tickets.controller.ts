import mongoose from 'mongoose';
import { Comment } from '../models/Comment';
import { Ticket } from '../models/Ticket';
import { ActivityLog } from '../models/ActivityLog';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { eventBus } from '../events/eventBus';
import type { AddCommentBody, CreateTicketBody, UpdateMyTicketBody } from '../validation/ticket.validation';

function requireAuthContext(auth: { userId: string; role: 'user' | 'admin' } | undefined) {
  if (!auth) throw new ApiError(401, 'Unauthorized');
  return auth;
}

export const createTicket = asyncHandler(async (req, res) => {
  const auth = requireAuthContext(req.auth);
  const { title, description, category, priority } = req.body as CreateTicketBody;

  const ticket = await Ticket.create({
    createdBy: new mongoose.Types.ObjectId(auth.userId),
    title,
    description,
    category,
    ...(priority ? { priority } : {}),
  });

  eventBus.emit('ticket.created', { ticketId: String(ticket._id), actorId: auth.userId });

  return res.status(201).json({ ticket });
});

export const listMyTickets = asyncHandler(async (req, res) => {
  const auth = requireAuthContext(req.auth);

  const tickets = await Ticket.find({ createdBy: auth.userId }).sort({ createdAt: -1 });
  return res.json({ tickets });
});

export const getTicket = asyncHandler(async (req, res) => {
  const auth = requireAuthContext(req.auth);
  const { id } = req.params as { id: string };

  const ticket = await Ticket.findById(id);
  if (!ticket) throw new ApiError(404, 'Ticket not found');

  const isOwner = String(ticket.createdBy) === auth.userId;
  if (auth.role !== 'admin' && !isOwner) throw new ApiError(403, 'Forbidden');

  return res.json({ ticket });
});

export const updateMyTicket = asyncHandler(async (req, res) => {
  const auth = requireAuthContext(req.auth);
  const { id } = req.params as { id: string };
  const patch = req.body as UpdateMyTicketBody;

  const ticket = await Ticket.findOne({ _id: id, createdBy: auth.userId });
  if (!ticket) throw new ApiError(404, 'Ticket not found');
  if (ticket.status !== 'open') throw new ApiError(409, 'Only open tickets can be edited');

  const changes: Record<string, unknown> = {};
  if (typeof patch.title === 'string' && patch.title !== ticket.title) {
    ticket.title = patch.title;
    changes.title = patch.title;
  }
  if (typeof patch.description === 'string' && patch.description !== ticket.description) {
    ticket.description = patch.description;
    changes.description = patch.description;
  }
  if (typeof patch.category === 'string' && patch.category !== ticket.category) {
    ticket.category = patch.category;
    changes.category = patch.category;
  }

  await ticket.save();

  if (Object.keys(changes).length > 0) {
    eventBus.emit('ticket.updated', { ticketId: String(ticket._id), actorId: auth.userId, changes });
  }

  return res.json({ ticket });
});

export const deleteMyTicket = asyncHandler(async (req, res) => {
  const auth = requireAuthContext(req.auth);
  const { id } = req.params as { id: string };

  const ticket = await Ticket.findOne({ _id: id, createdBy: auth.userId });
  if (!ticket) throw new ApiError(404, 'Ticket not found');
  if (ticket.status !== 'open') throw new ApiError(409, 'Only open tickets can be deleted');

  await Comment.deleteMany({ ticket: ticket._id });
  await ActivityLog.deleteMany({ ticket: ticket._id });
  await ticket.deleteOne();

  return res.status(204).send();
});

export const addComment = asyncHandler(async (req, res) => {
  const auth = requireAuthContext(req.auth);
  const { id } = req.params as { id: string };
  const { body } = req.body as AddCommentBody;

  const ticket = await Ticket.findById(id);
  if (!ticket) throw new ApiError(404, 'Ticket not found');

  const isOwner = String(ticket.createdBy) === auth.userId;
  if (auth.role !== 'admin' && !isOwner) throw new ApiError(403, 'Forbidden');

  const comment = await Comment.create({
    ticket: ticket._id,
    author: new mongoose.Types.ObjectId(auth.userId),
    body,
  });

  eventBus.emit('comment.added', {
    ticketId: String(ticket._id),
    actorId: auth.userId,
    commentId: String(comment._id),
  });

  return res.status(201).json({ comment });
});

export const listComments = asyncHandler(async (req, res) => {
  const auth = requireAuthContext(req.auth);
  const { id } = req.params as { id: string };

  const ticket = await Ticket.findById(id);
  if (!ticket) throw new ApiError(404, 'Ticket not found');

  const isOwner = String(ticket.createdBy) === auth.userId;
  if (auth.role !== 'admin' && !isOwner) throw new ApiError(403, 'Forbidden');

  const comments = await Comment.find({ ticket: id }).sort({ createdAt: 1 }).populate('author', 'name email role');
  return res.json({ comments });
});

export const listActivity = asyncHandler(async (req, res) => {
  const auth = requireAuthContext(req.auth);
  const { id } = req.params as { id: string };

  const ticket = await Ticket.findById(id);
  if (!ticket) throw new ApiError(404, 'Ticket not found');

  const isOwner = String(ticket.createdBy) === auth.userId;
  if (auth.role !== 'admin' && !isOwner) throw new ApiError(403, 'Forbidden');

  const activity = await ActivityLog.find({ ticket: id })
    .sort({ createdAt: -1 })
    .populate('actor', 'name email role');

  return res.json({ activity });
});

