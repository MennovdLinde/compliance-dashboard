export interface JwtPayload {
  userId: number;
  email: string;
  role: 'admin' | 'auditor' | 'viewer';
  company: string;
}

export interface AuthRequest extends Express.Request {
  user?: JwtPayload;
}

// Re-export for convenience
import { Request } from 'express';
export interface AuthedRequest extends Request {
  user: JwtPayload;
}
