import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(new ApiError(400, 'Invalid request body', err.flatten()));
      }
      return next(err);
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(new ApiError(400, 'Invalid query parameters', err.flatten()));
      }
      return next(err);
    }
  };
}

export function validateParams(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params);
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(new ApiError(400, 'Invalid route parameters', err.flatten()));
      }
      return next(err);
    }
  };
}

