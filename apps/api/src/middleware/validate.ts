import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export const validateBody = <T extends ZodSchema>(schema: T) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw result.error;
    }
    req.body = result.data;
    next();
  };
};

export const validateQuery = <T extends ZodSchema>(schema: T) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      throw result.error;
    }
    req.query = result.data as any;
    next();
  };
};

export const validateParams = <T extends ZodSchema>(schema: T) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      throw result.error;
    }
    req.params = result.data as any;
    next();
  };
};
