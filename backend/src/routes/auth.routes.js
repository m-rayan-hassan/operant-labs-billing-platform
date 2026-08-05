import express from "express";
import { authLimiter } from "../middlewares/rateLimiter.js";
import { protect } from "../middlewares/auth.middleware.js";
import {
  register,
  login,
  refresh,
  logout,
  getMe,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", protect, getMe);

export default router;