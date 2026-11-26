import { Router } from 'express';

import {
  adminGetTicketDetails,
  adminListActivity,
  adminListTickets,
  adminUpdateTicket,
} from '../controllers/admin.controller';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { objectIdParamSchema, paginationQuerySchema } from '../validation/common.validation';
import { adminTicketListQuerySchema, adminUpdateTicketSchema } from '../validation/ticket.validation';

export const adminRouter = Router();

/**
 * @openapi
 * /api/admin/health:
 *   get:
 *     tags: [Admin]
 *     summary: Admin module health check
 *     responses:
 *       200:
 *         description: OK
 */
adminRouter.get('/health', (_req, res) => res.json({ ok: true }));

adminRouter.use(requireAuth, requireRole('admin'));

/**
 * @openapi
 * /api/admin/tickets:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: List all tickets (admin) with filtering/pagination
 */
adminRouter.get('/tickets', validateQuery(adminTicketListQuerySchema), adminListTickets);

/**
 * @openapi
 * /api/admin/tickets/{id}:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Ticket details + comments + activity (admin)
 */
adminRouter.get('/tickets/:id', validateParams(objectIdParamSchema), adminGetTicketDetails);

/**
 * @openapi
 * /api/admin/tickets/{id}:
 *   patch:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Update ticket status/priority (admin)
 */
adminRouter.patch(
  '/tickets/:id',
  validateParams(objectIdParamSchema),
  validateBody(adminUpdateTicketSchema),
  adminUpdateTicket,
);

/**
 * @openapi
 * /api/admin/activity:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: List global activity (admin)
 */
adminRouter.get('/activity', validateQuery(paginationQuerySchema), adminListActivity);

