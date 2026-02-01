import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AdminConfig {
  enabled: boolean;
  password: string;
  jwtSecret: string;
  tokenExpiry: string;
}

function getAdminConfig(configPath: string): AdminConfig {
  // Read from config at runtime
  const fs = require('fs');
  const YAML = require('yaml');
  const raw = fs.readFileSync(configPath, 'utf-8');
  const config = YAML.parse(raw);
  return {
    enabled: config.admin?.enabled ?? true,
    password: process.env.ADMIN_PASSWORD || config.admin?.password || 'admin123',
    jwtSecret: process.env.ADMIN_JWT_SECRET || config.admin?.jwtSecret || 'change-me-in-production',
    tokenExpiry: config.admin?.tokenExpiry || '24h',
  };
}

export function createLoginHandler(configPath: string) {
  return (req: Request, res: Response) => {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }

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
