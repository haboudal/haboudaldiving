import { Request, Response, NextFunction, RequestHandler } from 'express';
import crypto from 'crypto';
import { config } from '../config';

// Async handler wrapper
export const asyncHandler = (fn: RequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Generate random token
export const generateToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

// Hash token for storage
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Encrypt sensitive data (PII)
export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(config.encryption.ivLength);
  const key = Buffer.from(config.encryption.key.padEnd(32, '0').slice(0, 32));
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

// Decrypt sensitive data
export const decrypt = (encrypted: string): string => {
  const [ivHex, encryptedText] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const key = Buffer.from(config.encryption.key.padEnd(32, '0').slice(0, 32));
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// Calculate age from date of birth
export const calculateAge = (dateOfBirth: string | Date): number => {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// Check if user is minor (under 18)
export const isMinor = (dateOfBirth: string | Date): boolean => {
  return calculateAge(dateOfBirth) < 18;
};

// Sanitize object by removing undefined/null values
export const sanitizeObject = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
  ) as Partial<T>;
};

// Generate slug from text
export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Paginate results helper
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const paginate = <T>(
  items: T[],
  total: number,
  params: PaginationParams
): PaginatedResult<T> => {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const totalPages = Math.ceil(total / limit);

  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
};
