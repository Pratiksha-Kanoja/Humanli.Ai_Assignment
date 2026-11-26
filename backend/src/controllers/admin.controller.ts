import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { Ticket } from '../models/Ticket';
import { Comment } from '../models/Comment';
import { ActivityLog } from '../models/ActivityLog';
import { eventBus } from '../events/eventBus';
import type { AdminTicketListQuery, AdminUpdateTicketBody } from '../validation/ticket.validation';
import type { PaginationQuery } from '../validation/common.validation';

function requireAdminAuth(auth: { userId: string; role: 'user' | 'admin' } | undefined) {
  if (!auth) throw new ApiError(401, 'Unauthorized');
  if (auth.role !== 'admin') throw new ApiError(403, 'Forbidden');
  return auth;
}

export const adminListTickets = asyncHandler(async (req, res) => {
  requireAdminAuth(req.auth);
  const { status, priority, userId, search, page, limit } = req.query as unknown as AdminTicketListQuery;

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (userId) filter.createdBy = userId;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const [tickets, total] = await Promise.all([
    Ticket.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('createdBy', 'name email role'),
    Ticket.countDocuments(filter),
  ]);

  return res.json({ tickets, page, limit, total });
});

export const adminGetTicketDetails = asyncHandler(async (req, res) => {
  requireAdminAuth(req.auth);
  const { id } = req.params as { id: string };

  const ticket = await Ticket.findById(id).populate('createdBy', 'name email role');
  if (!ticket) throw new ApiError(404, 'Ticket not found');

  const [comments, activity] = await Promise.all([
    Comment.find({ ticket: id }).sort({ createdAt: 1 }).populate('author', 'name email role'),
    ActivityLog.find({ ticket: id }).sort({ createdAt: -1 }).populate('actor', 'name email role'),
  ]);

  return res.json({ ticket, comments, activity });
});

export const adminUpdateTicket = asyncHandler(async (req, res) => {
  const auth = requireAdminAuth(req.auth);
  const { id } = req.params as { id: string };
  const { status, priority } = req.body as AdminUpdateTicketBody;

  const ticket = await Ticket.findById(id);
  if (!ticket) throw new ApiError(404, 'Ticket not found');

  const changes: Record<string, unknown> = {};

  if (priority && priority !== ticket.priority) {
    const from = ticket.priority;
    ticket.priority = priority;
    changes.priority = priority;
    eventBus.emit('ticket.priority_changed', {
      ticketId: String(ticket._id),
      actorId: auth.userId,
      from,
      to: ticket.priority,
    });
  }

  if (status && status !== ticket.status) {
    const from = ticket.status;
    ticket.status = status;
    changes.status = status;
    eventBus.emit('ticket.status_changed', {
      ticketId: String(ticket._id),
      actorId: auth.userId,
      from,
      to: ticket.status,
    });

    if (ticket.status === 'resolved') {
      eventBus.emit('ticket.resolved', { ticketId: String(ticket._id), actorId: auth.userId });
    }
  }

  await ticket.save();

  if (Object.keys(changes).length > 0) {
    eventBus.emit('ticket.updated', { ticketId: String(ticket._id), actorId: auth.userId, changes });
  }

  return res.json({ ticket });
});

export const adminListActivity = asyncHandler(async (req, res) => {
  requireAdminAuth(req.auth);
  const { page, limit } = req.query as unknown as PaginationQuery;

  const skip = (page - 1) * limit;
  const [activity, total] = await Promise.all([
    ActivityLog.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('actor', 'name email role')
      .populate('ticket', 'title status priority'),
    ActivityLog.countDocuments({}),
  ]);

  return res.json({ activity, page, limit, total });
});

