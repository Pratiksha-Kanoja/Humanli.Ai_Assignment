import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  // Expected client errors (4xx) are returned to the caller; only log unexpected failures
  if (!(err instanceof ApiError)) {
    console.error(err);
  }

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: { message: err.message, details: err.details },
    });
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: { message: 'Invalid id format' } });
  }

  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({
      error: { message: 'Validation error', details: err.errors },
    });
  }

  return res.status(500).json({ error: { message: 'Internal server error' } });
}

