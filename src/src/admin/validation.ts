import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Express middleware factory that validates req.body against a Zod schema.
 * Returns 400 with structured errors on validation failure.
 */
export function validateBody(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.issues.map((issue: any) => ({
          path: issue.path?.join('.') ?? '',
          message: issue.message,
        })),
      });
    }
    req.body = result.data;
    next();
  };
}

/**
 * Express middleware factory that validates req.params against a Zod schema.
 */
export function validateParams(schema: z.ZodType) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid parameters',
        details: result.error.issues.map((issue: any) => ({
          path: issue.path?.join('.') ?? '',
          message: issue.message,
        })),
      });
    }
    req.params = result.data as any;
    next();
  };
}
