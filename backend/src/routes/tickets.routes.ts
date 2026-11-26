import { Router } from 'express';

import {
  addComment,
  createTicket,
  deleteMyTicket,
  getTicket,
  listActivity,
  listComments,
  listMyTickets,
  updateMyTicket,
} from '../controllers/tickets.controller';
import { requireAuth } from '../middleware/requireAuth';
import { validateBody, validateParams } from '../middleware/validate';
import { objectIdParamSchema } from '../validation/common.validation';
import { addCommentSchema, createTicketSchema, updateMyTicketSchema } from '../validation/ticket.validation';

export const ticketsRouter = Router();

/**
 * @openapi
 * /api/tickets/health:
 *   get:
 *     tags: [Tickets]
 *     summary: Tickets module health check
 *     responses:
 *       200:
 *         description: OK
 */
ticketsRouter.get('/health', (_req, res) => res.json({ ok: true }));

// All ticket routes require auth
ticketsRouter.use(requireAuth);

/**
 * @openapi
 * /api/tickets:
 *   get:
 *     tags: [Tickets]
 *     security: [{ bearerAuth: [] }]
 *     summary: List current user's tickets
 */
ticketsRouter.get('/', listMyTickets);

/**
 * @openapi
 * /api/tickets:
 *   post:
 *     tags: [Tickets]
 *     security: [{ bearerAuth: [] }]
 *     summary: Create a new ticket
 */
ticketsRouter.post('/', validateBody(createTicketSchema), createTicket);

/**
 * @openapi
 * /api/tickets/{id}:
 *   get:
 *     tags: [Tickets]
 *     security: [{ bearerAuth: [] }]
 *     summary: Get a ticket (owner or admin)
 */
ticketsRouter.get('/:id', validateParams(objectIdParamSchema), getTicket);

/**
 * @openapi
 * /api/tickets/{id}:
 *   patch:
 *     tags: [Tickets]
 *     security: [{ bearerAuth: [] }]
 *     summary: Update an open ticket (owner only)
 */
ticketsRouter.patch('/:id', validateParams(objectIdParamSchema), validateBody(updateMyTicketSchema), updateMyTicket);

/**
 * @openapi
 * /api/tickets/{id}:
 *   delete:
 *     tags: [Tickets]
 *     security: [{ bearerAuth: [] }]
 *     summary: Delete an open ticket (owner only)
 */
ticketsRouter.delete('/:id', validateParams(objectIdParamSchema), deleteMyTicket);

/**
 * @openapi
 * /api/tickets/{id}/comments:
 *   get:
 *     tags: [Comments]
 *     security: [{ bearerAuth: [] }]
 *     summary: List comments for a ticket (owner or admin)
 */
ticketsRouter.get('/:id/comments', validateParams(objectIdParamSchema), listComments);

/**
 * @openapi
 * /api/tickets/{id}/comments:
 *   post:
 *     tags: [Comments]
 *     security: [{ bearerAuth: [] }]
 *     summary: Add a comment to a ticket (owner or admin)
 */
ticketsRouter.post('/:id/comments', validateParams(objectIdParamSchema), validateBody(addCommentSchema), addComment);

/**
 * @openapi
 * /api/tickets/{id}/activity:
 *   get:
 *     tags: [Activity]
 *     security: [{ bearerAuth: [] }]
 *     summary: List activity log for a ticket (owner or admin)
 */
ticketsRouter.get('/:id/activity', validateParams(objectIdParamSchema), listActivity);

