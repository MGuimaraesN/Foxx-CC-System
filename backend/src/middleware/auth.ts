import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/auth';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = header.split(' ')[1];
  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
