import rateLimit from "express-rate-limit";

// Brute-force protection on login/register — 10 attempts per 15 min per IP.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});