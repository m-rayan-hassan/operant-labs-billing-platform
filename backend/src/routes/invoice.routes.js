import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  listInvoices,
  createInvoice,
  getInvoice,
  updateInvoice,
  updateStatus,
  deleteInvoice,
  finalizeInvoice,
  getInvoicePDF,
} from "../controllers/invoice.controller.js";
import {
  recordPayment,
  listPayments,
} from "../controllers/payment.controller.js";

const router = express.Router();

router.use(protect);

router.get("/", listInvoices);
router.post("/", createInvoice);
router.get("/:id", getInvoice);
router.put("/:id", updateInvoice);
router.put("/:id/status", updateStatus);
router.post("/:id/finalize", finalizeInvoice);
router.get("/:id/pdf", getInvoicePDF);
router.delete("/:id", deleteInvoice);

// Payment sub-routes nested under invoices
router.post("/:id/payments", recordPayment);
router.get("/:id/payments", listPayments);

export default router;
