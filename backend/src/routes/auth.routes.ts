import { Router } from 'express';

import { login, me, register } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validate';
import { loginSchema, registerSchema } from '../validation/auth.validation';

export const authRouter = Router();

/**
 * @openapi
 * /api/auth/health:
 *   get:
 *     tags: [Auth]
 *     summary: Auth module health check
 *     responses:
 *       200:
 *         description: OK
 */
authRouter.get('/health', (_req, res) => res.json({ ok: true }));

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user (role defaults to user)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       201:
 *         description: Created
 */
authRouter.post('/register', validateBody(registerSchema), register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login
 */
authRouter.post('/login', validateBody(loginSchema), login);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user
 *     security:
 *       - bearerAuth: []
 */
authRouter.get('/me', requireAuth, me);

