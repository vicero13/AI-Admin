import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { validateBody } from './validation';

const loginSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export const validateLogin = validateBody(loginSchema);

export interface AdminConfig {
  enabled: boolean;
  password: string;
  jwtSecret: string;
  tokenExpiry: string;
}

const INSECURE_SECRETS = ['change-me-in-production', 'changeme', 'secret', 'admin123'];

function getAdminConfig(configPath: string): AdminConfig {
  const fs = require('fs');
  const YAML = require('yaml');
  const raw = fs.readFileSync(configPath, 'utf-8');
  const config = YAML.parse(raw);

  const password = process.env.ADMIN_PASSWORD || config.admin?.password;
  const jwtSecret = process.env.ADMIN_JWT_SECRET || config.admin?.jwtSecret;

  if (!password) {
    throw new Error('[AUTH] ADMIN_PASSWORD is not set. Set it via ADMIN_PASSWORD environment variable.');
  }

  if (!jwtSecret) {
    throw new Error('[AUTH] ADMIN_JWT_SECRET is not set. Set it via ADMIN_JWT_SECRET environment variable.');
  }

  if (process.env.NODE_ENV === 'production') {
    if (INSECURE_SECRETS.includes(password)) {
      throw new Error('[AUTH] ADMIN_PASSWORD is insecure. Use a strong password in production.');
    }
    if (INSECURE_SECRETS.includes(jwtSecret)) {
      throw new Error('[AUTH] ADMIN_JWT_SECRET is insecure. Use a strong secret in production.');
    }
  }

  return {
    enabled: config.admin?.enabled ?? true,
    password,
    jwtSecret,
    tokenExpiry: config.admin?.tokenExpiry || '24h',
  };
}

export function createLoginHandler(configPath: string) {
  return (req: Request, res: Response) => {
    const { password } = req.body;
    const adminConfig = getAdminConfig(configPath);

    if (password !== adminConfig.password) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = jwt.sign({ role: 'admin' }, adminConfig.jwtSecret, {
      expiresIn: adminConfig.tokenExpiry as any,
    });

    res.json({ token, expiresIn: adminConfig.tokenExpiry });
  };
}

export function createAuthMiddleware(configPath: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.slice(7);
    const adminConfig = getAdminConfig(configPath);

    try {
      const decoded = jwt.verify(token, adminConfig.jwtSecret);
      (req as any).admin = decoded;
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
}
