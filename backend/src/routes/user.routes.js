import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { requireRole } from "../middlewares/auth.middleware.js";
import {
  listUsers,
  createUser,
  updateUserRole,
  deleteUser,
} from "../controllers/user.controller.js";

const router = express.Router();

router.use(protect);
router.use(requireRole("CEO"));

router.get("/", listUsers);
router.post("/", createUser);
router.put("/:id/role", updateUserRole);
router.delete("/:id", deleteUser);

export default router;