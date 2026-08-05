import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;   // separate secret from refresh, never reuse
const ACCESS_TTL = '15m';
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;        // 30 days

// payload shape: { sub: userId, role: 'CEO' | 'HR' }

export function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

// Refresh tokens are opaque random strings, not JWTs — nothing to decode client-side,
// and revocation is a DB lookup rather than waiting for token expiry.
export function generateRefreshToken() {
  const raw = crypto.randomBytes(48).toString('base64url');
  const hash = hashToken(raw);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  return { raw, hash, expiresAt };
}

export function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export const REFRESH_COOKIE_NAME = 'refresh_token';
export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/auth/refresh',
  maxAge: REFRESH_TTL_MS,
};