import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { getStats, getCashflow } from "../controllers/dashboard.controller.js";

const router = express.Router();

router.use(protect);

router.get("/stats", getStats);
router.get("/cashflow", getCashflow);

export default router;