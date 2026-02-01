import fs from 'fs';
import path from 'path';
import os from 'os';
import YAML from 'yaml';
import jwt from 'jsonwebtoken';

// We test the auth functions by calling them with a temp config
describe('Auth', () => {
  let tmpDir: string;
  let configPath: string;
  const config = {
    admin: {
      enabled: true,
      password: 'test123',
      jwtSecret: 'test-secret-key',
      tokenExpiry: '1h',
    },
  };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-test-'));
    configPath = path.join(tmpDir, 'default.yaml');
    fs.writeFileSync(configPath, YAML.stringify(config));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('createLoginHandler returns 401 for wrong password', async () => {
    const { createLoginHandler } = require('../../src/admin/auth');
    const handler = createLoginHandler(configPath);
    const req = { body: { password: 'wrong' } } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;
    handler(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('createLoginHandler returns token for correct password', async () => {
    const { createLoginHandler } = require('../../src/admin/auth');
    const handler = createLoginHandler(configPath);
    const req = { body: { password: 'test123' } } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;
    handler(req, res);
    expect(res.json).toHaveBeenCalled();
    const call = res.json.mock.calls[0][0];
    expect(call.token).toBeTruthy();
    // Verify token is valid
    const decoded = jwt.verify(call.token, 'test-secret-key') as any;
    expect(decoded.role).toBe('admin');
  });

  test('createLoginHandler returns 400 without password', async () => {
    const { createLoginHandler } = require('../../src/admin/auth');
    const handler = createLoginHandler(configPath);
    const req = { body: {} } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;
    handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('createAuthMiddleware blocks requests without token', () => {
    const { createAuthMiddleware } = require('../../src/admin/auth');
    const middleware = createAuthMiddleware(configPath);
    const req = { headers: {} } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;
    const next = jest.fn();
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('createAuthMiddleware allows valid token', () => {
    const { createAuthMiddleware } = require('../../src/admin/auth');
    const middleware = createAuthMiddleware(configPath);
    const token = jwt.sign({ role: 'admin' }, 'test-secret-key');
    const req = { headers: { authorization: `Bearer ${token}` } } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;
    const next = jest.fn();
    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.admin.role).toBe('admin');
  });

  test('createAuthMiddleware rejects invalid token', () => {
    const { createAuthMiddleware } = require('../../src/admin/auth');
    const middleware = createAuthMiddleware(configPath);
    const token = jwt.sign({ role: 'admin' }, 'wrong-secret-key');
    const req = { headers: { authorization: `Bearer ${token}` } } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;
    const next = jest.fn();
    middleware(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
