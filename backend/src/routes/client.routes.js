import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  listClients,
  createClient,
  getClient,
  updateClient,
  deleteClient,
  addContact,
  listContacts,
} from "../controllers/client.controller.js";

const router = express.Router();

router.use(protect);

router.get("/", listClients);
router.post("/", createClient);
router.get("/:id", getClient);
router.put("/:id", updateClient);
router.delete("/:id", deleteClient);
router.post("/:id/contacts", addContact);
router.get("/:id/contacts", listContacts);

export default router;
