import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

function getSecret(): string {
  return process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'REMOVED';
}

function getPassword(): string {
  return process.env.ADMIN_PASSWORD || '';
}

export function loginHandler(req: Request, res: Response) {
  const { password } = req.body;
  const expected = getPassword();

  if (!expected) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD not configured' });
  }

  if (password !== expected) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const token = jwt.sign({ role: 'admin' }, getSecret(), { expiresIn: '24h' });
  res.json({ token, expiresIn: '24h' });
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, getSecret());
    (req as any).admin = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
