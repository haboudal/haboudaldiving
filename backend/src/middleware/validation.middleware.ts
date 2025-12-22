import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

type ValidationTarget = 'body' | 'query' | 'params';

export const validate = (schema: ZodSchema, target: ValidationTarget = 'body') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const data = req[target];
      const validated = schema.parse(data);

      // Replace with validated (and transformed) data
      if (target === 'body') {
        req.body = validated;
      } else if (target === 'query') {
        req.query = validated;
      } else if (target === 'params') {
        req.params = validated;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: Record<string, string[]> = {};

        for (const issue of error.issues) {
          const path = issue.path.join('.');
          if (!errors[path]) {
            errors[path] = [];
          }
          errors[path].push(issue.message);
        }

        throw new ValidationError('Validation failed', errors);
      }

      throw error;
    }
  };
};

export const validateMultiple = (schemas: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const allErrors: Record<string, string[]> = {};

    for (const [target, schema] of Object.entries(schemas)) {
      if (!schema) continue;

      try {
        const data = req[target as ValidationTarget];
        const validated = schema.parse(data);

        if (target === 'body') {
          req.body = validated;
        } else if (target === 'query') {
          req.query = validated;
        } else if (target === 'params') {
          req.params = validated;
        }
      } catch (error) {
        if (error instanceof ZodError) {
          for (const issue of error.issues) {
            const path = `${target}.${issue.path.join('.')}`;
            if (!allErrors[path]) {
              allErrors[path] = [];
            }
            allErrors[path].push(issue.message);
          }
        } else {
          throw error;
        }
      }
    }

    if (Object.keys(allErrors).length > 0) {
      throw new ValidationError('Validation failed', allErrors);
    }

    next();
  };
};
